/**
 * KnexAdapter — Full DatabaseAdapter implementation using Knex.
 */

import knex, { type Knex } from 'knex'
import type { FieldDefinition, Logger } from '@data-engine/schema'
import type {
  DatabaseAdapter,
  DatabaseHealth,
  DatabaseSchema,
  FieldChanges,
  FieldType,
  PrimaryKeyStrategy,
  PopulateDefinition,
  QueryAST,
  SchemaMeta,
  TransactionClient,
} from '@data-engine/adapter'
import { ConnectionError, SchemaError, QueryError } from '@data-engine/adapter'
import { applyFieldToTable, fieldTypeToColumnType } from './type-mapping.js'
import { applyQueryAST } from './query-builder.js'
import { introspectDatabase } from './introspection.js'

// ─── Config ──────────────────────────────────────────────────────────

export interface KnexAdapterConfig {
  client: 'pg' | 'sqlite3' | 'better-sqlite3' | 'mysql2'
  host?: string
  port?: number
  database: string
  user?: string
  password?: string
  pool?: { min?: number; max?: number }
  primaryKey?: PrimaryKeyStrategy
  logger?: Logger
}

// ─── Adapter ─────────────────────────────────────────────────────────

export class KnexAdapter implements DatabaseAdapter {
  private knex: Knex | null = null
  private connected = false
  private connectedSince: string | null = null
  readonly primaryKeyStrategy: PrimaryKeyStrategy
  private logger?: Logger
  private activeSchema: string

  constructor(private readonly config: KnexAdapterConfig) {
    this.primaryKeyStrategy = config.primaryKey ?? 'uuid'
    this.logger = config.logger
    this.activeSchema = this.isSQLite() ? 'main' : 'public'
  }

  private isSQLite(): boolean {
    return this.config.client === 'sqlite3' || this.config.client === 'better-sqlite3'
  }

  // ── Lifecycle (DA-002) ───────────────────────────────────────────

  async connect(): Promise<void> {
    try {
      const isSQLite = this.isSQLite()
      this.knex = knex({
        client: this.config.client,
        connection: isSQLite
          ? { filename: this.config.database }
          : {
              host: this.config.host,
              port: this.config.port,
              database: this.config.database,
              user: this.config.user,
              password: this.config.password,
            },
        useNullAsDefault: isSQLite,
        pool: {
          min: this.config.pool?.min ?? 2,
          max: this.config.pool?.max ?? 10,
        },
      })

      // Ping to verify connection
      await this.knex.raw('SELECT 1')
      this.connected = true
      this.connectedSince = new Date().toISOString()
    } catch (err) {
      this.connected = false
      throw new ConnectionError('Failed to connect to database', err)
    }
  }

  async disconnect(): Promise<void> {
    if (this.knex) {
      await this.knex.destroy()
      this.knex = null
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  // ── Health ────────────────────────────────────────────────────────

  async health(): Promise<DatabaseHealth> {
    const adapterName = this.isSQLite()
      ? 'sqlite'
      : this.config.client === 'pg'
        ? 'postgres'
        : 'mysql'

    const base: DatabaseHealth = {
      adapter: adapterName,
      version: 'unknown',
      host: this.isSQLite()
        ? this.config.database
        : `${this.config.host ?? 'localhost'}:${this.config.port ?? (adapterName === 'postgres' ? 5432 : 3306)}`,
      database: this.config.database,
      status: 'disconnected',
      latencyMs: 0,
      connectedSince: this.connectedSince ?? undefined,
    }

    if (!this.knex || !this.connected) {
      base.status = 'disconnected'
      base.error = 'Not connected'
      return base
    }

    try {
      const start = performance.now()
      await this.knex.raw('SELECT 1')
      base.latencyMs = Math.round(performance.now() - start)

      // Get version
      try {
        if (this.isSQLite()) {
          const vResult = await this.knex.raw('SELECT sqlite_version() as v')
          const ver = Array.isArray(vResult) ? vResult[0]?.v : vResult?.rows?.[0]?.v
          base.version = `SQLite ${ver ?? '3.x.x'}`
        } else if (adapterName === 'postgres') {
          const vResult = await this.knex.raw('SHOW server_version')
          base.version = `PostgreSQL ${vResult.rows?.[0]?.server_version ?? 'unknown'}`
        } else {
          const vResult = await this.knex.raw('SELECT VERSION() as v')
          base.version = vResult[0]?.[0]?.v ?? 'unknown'
        }
      } catch {
        // version query failed, keep 'unknown'
      }

      base.status = base.latencyMs > 500 ? 'slow' : 'connected'
    } catch (err) {
      base.status = 'disconnected'
      base.error = err instanceof Error ? err.message : 'Unknown error'
    }

    return base
  }

  // ── DDL Operations (DA-003) ──────────────────────────────────────

  async createCollection(name: string, fields: FieldDefinition[]): Promise<void> {
    const db = this.db()
    this.logger?.debug('createCollection', { collection: name, fieldCount: fields.length })
    try {
      await db.transaction(async (trx) => {
        // Filter out virtual field types (lookup fields have no DB column)
        const dbFields = fields.filter((f) => f.type !== 'lookup')
        const schemaBuilder = this.activeSchema !== this.defaultSchema()
          ? trx.schema.withSchema(this.activeSchema)
          : trx.schema
        await schemaBuilder.createTable(name, (table) => {
          // System columns — PK based on strategy
          if (this.primaryKeyStrategy === 'auto-increment') {
            table.increments('id').primary()
          } else {
            // UUID strategy: text column for SQLite, native uuid for Postgres
            if (this.config.client === 'pg') {
              table.uuid('id').primary()
            } else {
              table.text('id').primary()
            }
          }
          table.timestamp('created_at', { useTz: true }).defaultTo(db.fn.now()).notNullable()
          table.timestamp('updated_at', { useTz: true }).defaultTo(db.fn.now()).notNullable()

          // User-defined fields
          for (const field of dbFields) {
            applyFieldToTable(table, field)

            // Handle relation FK constraints
            if (field.type === 'relation' && field.relation) {
              if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
                table
                  .foreign(field.name)
                  .references('id')
                  .inTable(field.relation.target)
                  .onDelete('SET NULL')
              }
            }
          }
        })

        // Create indexes on foreign key / relation columns
        for (const field of dbFields) {
          if (field.type === 'relation' && field.relation) {
            if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
              await trx.raw(
                `CREATE INDEX IF NOT EXISTS idx_${name}_${field.name} ON "${name}"("${field.name}")`,
              )
            }
          }
        }

        // Create junction tables for manyToMany relations
        for (const field of dbFields) {
          if (field.type === 'relation' && field.relation?.type === 'manyToMany') {
            const junctionTable = field.relation.junctionTable ?? `${name}_${field.relation.target}`
            await trx.schema.createTable(junctionTable, (table) => {
              table.increments('id').primary()
              table
                .integer(`${name}_id`)
                .unsigned()
                .notNullable()
                .references('id')
                .inTable(name)
                .onDelete('CASCADE')
              table
                .integer(`${field.relation!.target}_id`)
                .unsigned()
                .notNullable()
                .references('id')
                .inTable(field.relation!.target)
                .onDelete('CASCADE')
              table.unique([`${name}_id`, `${field.relation!.target}_id`])
            })
          }
        }
      })
    } catch (err) {
      throw new SchemaError(`Failed to create collection '${name}'`, err)
    }
  }

  async dropCollection(name: string): Promise<void> {
    const db = this.db()
    this.logger?.debug('dropCollection', { collection: name })
    try {
      const schemaBuilder = this.activeSchema !== this.defaultSchema()
        ? db.schema.withSchema(this.activeSchema)
        : db.schema
      await schemaBuilder.dropTableIfExists(name)
    } catch (err) {
      throw new SchemaError(`Failed to drop collection '${name}'`, err)
    }
  }

  async addField(collection: string, field: FieldDefinition): Promise<void> {
    // Lookup fields are virtual — no DB column needed
    if (field.type === 'lookup') return
    const db = this.db()
    this.logger?.debug('addField', { collection, field: field.name })
    try {
      await db.transaction(async (trx) => {
        await trx.schema.alterTable(collection, (table) => {
          const col = applyFieldToTable(table, field)

          // If required and table may have rows, need a default
          if (field.required && field.default === undefined) {
            const defaultVal = getImplicitDefault(field.type as FieldType)
            if (defaultVal !== undefined) {
              col.defaultTo(defaultVal as Knex.Value)
            }
          }

          // FK for relation fields
          if (field.type === 'relation' && field.relation) {
            if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
              table
                .foreign(field.name)
                .references('id')
                .inTable(field.relation.target)
                .onDelete('SET NULL')
            }
          }
        })

        // Index for relation FK columns
        if (field.type === 'relation' && field.relation) {
          if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
            await trx.raw(
              `CREATE INDEX IF NOT EXISTS idx_${collection}_${field.name} ON "${collection}"("${field.name}")`,
            )
          }
        }

        // Junction table for m2m
        if (field.type === 'relation' && field.relation?.type === 'manyToMany') {
          const junctionTable =
            field.relation.junctionTable ?? `${collection}_${field.relation.target}`
          await trx.schema.createTable(junctionTable, (table) => {
            table.increments('id').primary()
            table
              .integer(`${collection}_id`)
              .unsigned()
              .notNullable()
              .references('id')
              .inTable(collection)
              .onDelete('CASCADE')
            table
              .integer(`${field.relation!.target}_id`)
              .unsigned()
              .notNullable()
              .references('id')
              .inTable(field.relation!.target)
              .onDelete('CASCADE')
            table.unique([`${collection}_id`, `${field.relation!.target}_id`])
          })
        }
      })
    } catch (err) {
      throw new SchemaError(`Failed to add field '${field.name}' to '${collection}'`, err)
    }
  }

  async removeField(collection: string, fieldName: string): Promise<void> {
    const db = this.db()
    try {
      await db.transaction(async (trx) => {
        await trx.schema.alterTable(collection, (table) => {
          table.dropColumn(fieldName)
        })
      })
    } catch (err) {
      throw new SchemaError(`Failed to remove field '${fieldName}' from '${collection}'`, err)
    }
  }

  async alterField(collection: string, fieldName: string, changes: FieldChanges): Promise<void> {
    const db = this.db()
    try {
      await db.transaction(async (trx) => {
        // Rename first if needed
        if (changes.rename) {
          await trx.schema.alterTable(collection, (table) => {
            table.renameColumn(fieldName, changes.rename!)
          })
          fieldName = changes.rename
        }

        // Type change, nullable, default
        const hasAlter =
          changes.type || changes.nullable !== undefined || changes.default !== undefined
        if (hasAlter) {
          await trx.schema.alterTable(collection, (table) => {
            let col: Knex.ColumnBuilder

            if (changes.type) {
              // Rebuild column with new type
              const colType = fieldTypeToColumnType(changes.type)
              col = table.specificType(fieldName, colType).alter()
            } else {
              // Just alter modifiers — use raw alter
              col = table.specificType(fieldName, '').alter()
            }

            if (changes.nullable === false || changes.required === true) {
              col = col.notNullable()
            } else if (changes.nullable === true || changes.required === false) {
              col = col.nullable()
            }

            if (changes.default !== undefined) {
              col = col.defaultTo(changes.default as Knex.Value)
            }

            if (changes.unique === true) {
              col.unique()
            }
          })
        }
      })
    } catch (err) {
      throw new SchemaError(`Failed to alter field '${fieldName}' in '${collection}'`, err)
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────

  async create(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const db = this.db()
    try {
      const now = new Date().toISOString()
      const row = { ...data, created_at: now, updated_at: now }
      const [result] = await this.scopedQuery(db, collection).insert(row).returning('*')
      return result
    } catch (err) {
      throw new QueryError(`Failed to create record in '${collection}'`, err)
    }
  }

  async findMany(collection: string, query: QueryAST): Promise<Record<string, unknown>[]> {
    const db = this.db()
    try {
      let qb = this.scopedQuery(db, collection)
      qb = applyQueryAST(qb, query)
      return await qb
    } catch (err) {
      throw new QueryError(`Failed to query '${collection}'`, err)
    }
  }

  async findOne(collection: string, query: QueryAST): Promise<Record<string, unknown> | null> {
    const limited = { ...query, limit: 1 }
    const results = await this.findMany(collection, limited)
    return results[0] ?? null
  }

  async update(
    collection: string,
    query: QueryAST,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const db = this.db()
    try {
      const updateData = { ...data, updated_at: new Date().toISOString() }
      let qb = this.scopedQuery(db, collection)
      qb = applyQueryAST(qb, query)
      return await qb.update(updateData).returning('*')
    } catch (err) {
      throw new QueryError(`Failed to update records in '${collection}'`, err)
    }
  }

  async delete(collection: string, query: QueryAST): Promise<number> {
    const db = this.db()
    try {
      let qb = this.scopedQuery(db, collection)
      qb = applyQueryAST(qb, query)
      return await qb.delete()
    } catch (err) {
      throw new QueryError(`Failed to delete records from '${collection}'`, err)
    }
  }

  // ── Aggregation ───────────────────────────────────────────────────

  async count(collection: string, query?: QueryAST): Promise<number> {
    const db = this.db()
    try {
      let qb = this.scopedQuery(db, collection)
      if (query) {
        qb = applyQueryAST(qb, { ...query, limit: undefined, offset: undefined, sort: undefined })
      }
      const result = await qb.count('* as count').first()
      return Number(result?.count ?? 0)
    } catch (err) {
      throw new QueryError(`Failed to count records in '${collection}'`, err)
    }
  }

  // ── Relations ────────────────────────────────────────────────────

  async findWithRelations(
    collection: string,
    query: QueryAST,
    populate: PopulateDefinition[],
  ): Promise<Record<string, unknown>[]> {
    const db = this.db()
    try {
      // Fetch base records
      const records = await this.findMany(collection, query)
      if (records.length === 0) return records

      // Populate each relation
      for (const pop of populate) {
        if (pop.type === 'manyToOne' || pop.type === 'oneToOne') {
          // Collect FK values
          const fkValues = [...new Set(records.map((r) => r[pop.foreignKey]).filter(Boolean))]
          if (fkValues.length === 0) continue

          let relQb = db(pop.collection).whereIn('id', fkValues as number[])
          if (pop.select) relQb = relQb.select(pop.select)
          const related = await relQb
          const relMap = new Map(related.map((r) => [r.id, r]))

          for (const record of records) {
            const fk = record[pop.foreignKey]
            record[pop.field] = fk != null ? (relMap.get(fk) ?? null) : null
          }
        } else if (pop.type === 'oneToMany') {
          const ids = records.map((r) => r.id).filter(Boolean)
          if (ids.length === 0) continue

          let relQb = db(pop.collection).whereIn(pop.foreignKey, ids as number[])
          if (pop.select) relQb = relQb.select([...pop.select, pop.foreignKey])
          const related = await relQb

          const relMap = new Map<unknown, Record<string, unknown>[]>()
          for (const r of related) {
            const key = r[pop.foreignKey]
            if (!relMap.has(key)) relMap.set(key, [])
            relMap.get(key)!.push(r)
          }

          for (const record of records) {
            record[pop.field] = relMap.get(record.id) ?? []
          }
        } else if (pop.type === 'manyToMany' && pop.junctionTable) {
          const ids = records.map((r) => r.id).filter(Boolean)
          if (ids.length === 0) continue

          const srcCol = `${collection}_id`
          const tgtCol = `${pop.collection}_id`

          const junctions = await db(pop.junctionTable).whereIn(srcCol, ids as number[])

          const tgtIds = [...new Set(junctions.map((j) => j[tgtCol]))]
          if (tgtIds.length === 0) {
            for (const record of records) record[pop.field] = []
            continue
          }

          let relQb = db(pop.collection).whereIn('id', tgtIds as number[])
          if (pop.select) relQb = relQb.select(pop.select)
          const related = await relQb
          const relMap = new Map(related.map((r) => [r.id, r]))

          // Build junction map: srcId → [related records]
          const jMap = new Map<unknown, Record<string, unknown>[]>()
          for (const j of junctions) {
            const src = j[srcCol]
            if (!jMap.has(src)) jMap.set(src, [])
            const rel = relMap.get(j[tgtCol])
            if (rel) jMap.get(src)!.push(rel)
          }

          for (const record of records) {
            record[pop.field] = jMap.get(record.id) ?? []
          }
        }
      }

      return records
    } catch (err) {
      throw new QueryError(`Failed to query '${collection}' with relations`, err)
    }
  }

  // ── Transactions ─────────────────────────────────────────────────

  async transaction<T>(fn: (trx: TransactionClient) => Promise<T>): Promise<T> {
    const db = this.db()
    return db.transaction(async (knexTrx) => {
      const client: TransactionClient = {
        create: async (collection, data) => {
          const now = new Date().toISOString()
          const row = { ...data, created_at: now, updated_at: now }
          const [result] = await knexTrx(collection).insert(row).returning('*')
          return result
        },
        findMany: async (collection, query) => {
          let qb = knexTrx(collection)
          qb = applyQueryAST(qb, query)
          return await qb
        },
        findOne: async (collection, query) => {
          const limited = { ...query, limit: 1 }
          let qb = knexTrx(collection)
          qb = applyQueryAST(qb, limited)
          const results = await qb
          return results[0] ?? null
        },
        update: async (collection, query, data) => {
          const updateData = { ...data, updated_at: new Date().toISOString() }
          let qb = knexTrx(collection)
          qb = applyQueryAST(qb, query)
          return await qb.update(updateData).returning('*')
        },
        delete: async (collection, query) => {
          let qb = knexTrx(collection)
          qb = applyQueryAST(qb, query)
          return await qb.delete()
        },
      }
      return fn(client)
    })
  }

  // ── Introspection (DA-005) ───────────────────────────────────────

  async introspect(): Promise<DatabaseSchema> {
    return introspectDatabase(this.db())
  }

  // ── Database Schema (Namespace) Operations ────────────────────

  async createSchema(name: string): Promise<void> {
    const db = this.db()
    if (this.isSQLite()) {
      // SQLite: attach a new database file
      const path = await import('path')
      const fs = await import('fs')
      const mainDb = this.config.database
      const dir = path.dirname(mainDb)
      const base = path.basename(mainDb, path.extname(mainDb))
      const schemaDb = path.join(dir, `${base}_${name}.db`)
      // Create file if it doesn't exist
      if (!fs.existsSync(schemaDb)) {
        fs.writeFileSync(schemaDb, '')
      }
      await db.raw(`ATTACH DATABASE '${schemaDb}' AS "${name}"`)
    } else {
      await db.raw(`CREATE SCHEMA IF NOT EXISTS "${name}"`)
    }
    // Insert metadata row
    await this.ensureSchemaMetaTable()
    await db('_schema_meta').insert({ name }).onConflict('name').merge()
  }

  async listSchemas(): Promise<string[]> {
    const db = this.db()
    if (this.isSQLite()) {
      const result = await db.raw('PRAGMA database_list')
      return (result as Array<{ name: string }>).map((r) => r.name)
    } else {
      const result = await db.raw(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'`,
      )
      return result.rows.map((r: { schema_name: string }) => r.schema_name)
    }
  }

  async dropSchema(name: string, cascade?: boolean): Promise<void> {
    const db = this.db()
    // Clean up metadata
    try {
      await this.ensureSchemaMetaTable()
      await db('_schema_meta').where('name', name).delete()
    } catch (_) { /* ignore if table doesn't exist yet */ }
    if (this.isSQLite()) {
      const path = await import('path')
      const fs = await import('fs')
      await db.raw(`DETACH DATABASE "${name}"`)
      const mainDb = this.config.database
      const dir = path.dirname(mainDb)
      const base = path.basename(mainDb, path.extname(mainDb))
      const schemaDb = path.join(dir, `${base}_${name}.db`)
      if (fs.existsSync(schemaDb)) {
        fs.unlinkSync(schemaDb)
      }
      if (this.activeSchema === name) {
        this.activeSchema = 'main'
      }
    } else {
      const cascadeSql = cascade ? ' CASCADE' : ''
      await db.raw(`DROP SCHEMA "${name}"${cascadeSql}`)
      if (this.activeSchema === name) {
        this.activeSchema = 'public'
      }
    }
  }

  setSchema(name: string): void {
    this.activeSchema = name
  }

  getSchema(): string {
    return this.activeSchema
  }

  // ── Schema Metadata ──────────────────────────────────────────────

  private _schemaMetaEnsured = false

  async ensureSchemaMetaTable(): Promise<void> {
    if (this._schemaMetaEnsured) return
    const db = this.db()
    const exists = await db.schema.hasTable('_schema_meta')
    if (!exists) {
      await db.schema.createTable('_schema_meta', (table) => {
        table.text('name').primary()
        table.text('description').nullable()
        table.text('icon').nullable()
        table.timestamp('created_at').defaultTo(db.fn.now())
      })
    }
    this._schemaMetaEnsured = true
  }

  async getSchemaMetadata(name: string): Promise<SchemaMeta | null> {
    await this.ensureSchemaMetaTable()
    const db = this.db()
    const row = await db('_schema_meta').where('name', name).first()
    if (!row) return null
    return { name: row.name, description: row.description ?? undefined, icon: row.icon ?? undefined, createdAt: row.created_at ?? undefined }
  }

  async updateSchemaMetadata(name: string, meta: Partial<Omit<SchemaMeta, 'name'>>): Promise<void> {
    await this.ensureSchemaMetaTable()
    const db = this.db()
    const row: Record<string, unknown> = { name }
    if (meta.description !== undefined) row.description = meta.description
    if (meta.icon !== undefined) row.icon = meta.icon
    if (meta.createdAt !== undefined) row.created_at = meta.createdAt
    await db('_schema_meta').insert(row).onConflict('name').merge()
  }

  async listSchemasWithMeta(): Promise<SchemaMeta[]> {
    await this.ensureSchemaMetaTable()
    const schemas = await this.listSchemas()
    const db = this.db()
    const metaRows = await db('_schema_meta')
    const metaMap = new Map<string, Record<string, unknown>>()
    for (const row of metaRows) {
      metaMap.set(row.name, row)
    }
    return schemas.map((name) => {
      const meta = metaMap.get(name)
      return {
        name,
        description: (meta?.description as string) ?? undefined,
        icon: (meta?.icon as string) ?? undefined,
        createdAt: (meta?.created_at as string) ?? undefined,
      }
    })
  }

  // ── Internal ─────────────────────────────────────────────────────

  private defaultSchema(): string {
    return this.isSQLite() ? 'main' : 'public'
  }

  private scopedQuery(db: Knex, collection: string): Knex.QueryBuilder {
    if (this.activeSchema !== this.defaultSchema()) {
      return db(collection).withSchema(this.activeSchema)
    }
    return db(collection)
  }

  private db(): Knex {
    if (!this.knex || !this.connected) {
      throw new ConnectionError('Not connected to database')
    }
    return this.knex
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getImplicitDefault(type: FieldType): unknown {
  switch (type) {
    case 'text':
    case 'email':
    case 'select':
      return ''
    case 'integer':
      return 0
    case 'float':
      return 0.0
    case 'boolean':
      return false
    case 'json':
      return '{}'
    default:
      return undefined
  }
}
