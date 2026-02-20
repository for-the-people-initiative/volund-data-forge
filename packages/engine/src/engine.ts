/**
 * CE-003 through CE-008: DataEngine — CRUD operations with hooks, relations, transactions
 */

import type { SchemaRegistry, CollectionSchema, Logger, OnDeletePolicy } from '@data-engine/schema';
import { compileValidator, generateUUIDv7, EngineError } from '@data-engine/schema';
import type { DatabaseAdapter, QueryAST, TransactionClient, PopulateDefinition, PrimaryKeyStrategy } from '@data-engine/adapter';
import type { HookEvent, HookFunction, HookContext, EngineOptions, PopulateOption } from './types.js';
import { validateQuery, QueryCompilationError } from './query-compiler.js';

export { EngineError };

export class DataEngine {
  private hooks = new Map<string, Map<HookEvent, HookFunction[]>>();
  private defaultLimit: number;
  protected logger?: Logger;

  constructor(
    private registry: SchemaRegistry,
    private adapter: DatabaseAdapter,
    options?: EngineOptions,
  ) {
    this.defaultLimit = options?.defaultLimit ?? 100;
    this.logger = options?.logger;
  }

  // ─── Hook Registration (CE-003/004/005/006) ──────────────────────

  registerHook(collection: string, event: HookEvent, handler: HookFunction): void {
    if (!this.hooks.has(collection)) {
      this.hooks.set(collection, new Map());
    }
    const collHooks = this.hooks.get(collection)!;
    if (!collHooks.has(event)) {
      collHooks.set(event, []);
    }
    collHooks.get(event)!.push(handler);
  }

  private async fireHooks(ctx: HookContext): Promise<void> {
    const handlers = this.hooks.get(ctx.collection)?.get(ctx.event);
    if (!handlers) return;
    for (const handler of handlers) {
      await handler(ctx);
    }
  }

  // ─── Schema Helpers ───────────────────────────────────────────────

  private getSchema(collection: string): CollectionSchema {
    const schema = this.registry.get(collection);
    if (!schema) {
      throw new EngineError(`Collection "${collection}" not found in registry`, 'COLLECTION_NOT_FOUND');
    }
    return schema;
  }

  // ─── CE-003: Create ───────────────────────────────────────────────

  async create(
    collection: string,
    data: Record<string, unknown>,
    txClient?: TransactionClient,
  ): Promise<Record<string, unknown>> {
    const schema = this.getSchema(collection);

    // Validate data against schema
    const validator = compileValidator(schema, { extraFields: 'strip' });
    const result = validator(data);
    if (!result.valid) {
      throw new EngineError(
        `Validation failed: ${result.errors.map((e: { path: string; message: string }) => `${e.path}: ${e.message}`).join('; ')}`,
        'VALIDATION_ERROR',
      );
    }

    // Build record with system fields and defaults
    const now = new Date().toISOString();
    const record: Record<string, unknown> = {
      ...result.data,
      created_at: now,
      updated_at: now,
    };

    // Only generate UUID if adapter uses uuid strategy
    if (this.adapter.primaryKeyStrategy !== 'auto-increment') {
      record.id = generateUUIDv7();
    }

    // Apply defaults for missing fields
    for (const field of schema.fields) {
      if (record[field.name] === undefined && field.default !== undefined) {
        record[field.name] = field.default;
      }
    }

    const hookCtx: HookContext = { collection, event: 'beforeCreate', data: record, transaction: txClient };
    await this.fireHooks(hookCtx);

    const start = Date.now();
    const client = txClient ?? this.adapter;
    let created: Record<string, unknown>;
    try {
      created = await client.create(collection, record);
    } catch (err) {
      this.logger?.error('Create failed', { collection, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
    this.logger?.debug('Create', { collection, operation: 'create', durationMs: Date.now() - start });

    await this.fireHooks({ collection, event: 'afterCreate', data: created, result: created, transaction: txClient });

    return created;
  }

  // ─── CE-004: findMany & findOne ───────────────────────────────────

  async findMany(
    collection: string,
    query?: QueryAST,
    populate?: Array<string | PopulateOption>,
    txClient?: TransactionClient,
  ): Promise<Record<string, unknown>[]> {
    const schema = this.getSchema(collection);

    const effectiveQuery: QueryAST = {
      limit: this.defaultLimit,
      ...query,
    };

    if (Object.keys(effectiveQuery).length > 0) {
      validateQuery(schema, effectiveQuery);
    }

    await this.fireHooks({ collection, event: 'beforeRead', query: effectiveQuery, transaction: txClient });

    const start = Date.now();
    let results: Record<string, unknown>[];
    const client = txClient ?? this.adapter;

    try {
    if (populate && populate.length > 0) {
      const popDefs = this.buildPopulateDefinitions(schema, populate);
      // Use adapter's findWithRelations if no transaction, otherwise manual
      if (!txClient) {
        results = await this.adapter.findWithRelations(collection, effectiveQuery, popDefs);
      } else {
        results = await client.findMany(collection, effectiveQuery);
        await this.populateResults(collection, results, populate, txClient, 0);
      }
    } else {
      results = await client.findMany(collection, effectiveQuery);
    }
    } catch (err) {
      this.logger?.error('FindMany failed', { collection, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
    this.logger?.debug('FindMany', { collection, operation: 'findMany', durationMs: Date.now() - start });

    await this.fireHooks({ collection, event: 'afterRead', query: effectiveQuery, result: results, transaction: txClient });

    return results;
  }

  async findOne(
    collection: string,
    query?: QueryAST,
    populate?: Array<string | PopulateOption>,
    txClient?: TransactionClient,
  ): Promise<Record<string, unknown> | null> {
    const effectiveQuery: QueryAST = {
      ...query,
      limit: 1,
    };

    const results = await this.findMany(collection, effectiveQuery, populate, txClient);
    return results[0] ?? null;
  }

  // ─── CE-005: Update ───────────────────────────────────────────────

  async update(
    collection: string,
    query: QueryAST,
    data: Record<string, unknown>,
    txClient?: TransactionClient,
  ): Promise<Record<string, unknown>[]> {
    const schema = this.getSchema(collection);

    // Reject system field updates
    const REJECTED_FIELDS = ['id', 'created_at'];
    for (const field of REJECTED_FIELDS) {
      if (field in data) {
        throw new EngineError(`Cannot update system field "${field}"`, 'SYSTEM_FIELD_UPDATE');
      }
    }

    // Partial validation
    const validator = compileValidator(schema, { partial: true, extraFields: 'strip' });
    const result = validator(data);
    if (!result.valid) {
      throw new EngineError(
        `Validation failed: ${result.errors.map(e => `${e.path}: ${e.message}`).join('; ')}`,
        'VALIDATION_ERROR',
      );
    }

    validateQuery(schema, query);

    const updateData: Record<string, unknown> = {
      ...result.data,
      updated_at: new Date().toISOString(),
    };

    await this.fireHooks({ collection, event: 'beforeUpdate', data: updateData, query, transaction: txClient });

    const start = Date.now();
    const client = txClient ?? this.adapter;
    let updated: Record<string, unknown>[];
    try {
      updated = await client.update(collection, query, updateData);
    } catch (err) {
      this.logger?.error('Update failed', { collection, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
    this.logger?.debug('Update', { collection, operation: 'update', durationMs: Date.now() - start });

    await this.fireHooks({ collection, event: 'afterUpdate', data: updateData, query, result: updated, transaction: txClient });

    return updated;
  }

  // ─── CE-006: Delete ───────────────────────────────────────────────

  async delete(
    collection: string,
    query: QueryAST,
    options?: { deleteAll?: boolean },
    txClient?: TransactionClient,
  ): Promise<number> {
    const schema = this.getSchema(collection);

    // Safety: reject delete without filter unless deleteAll is explicitly set
    const hasFilters = query.filters &&
      ((query.filters.and && query.filters.and.length > 0) ||
       (query.filters.or && query.filters.or.length > 0));

    if (!hasFilters && !options?.deleteAll) {
      throw new EngineError(
        'Delete without filters requires { deleteAll: true } for safety',
        'UNSAFE_DELETE',
      );
    }

    validateQuery(schema, query);

    await this.fireHooks({ collection, event: 'beforeDelete', query, transaction: txClient });

    // ── onDelete policy enforcement ──
    // Find records to be deleted first
    const client = txClient ?? this.adapter;
    const toDelete = await client.findMany(collection, query);
    if (toDelete.length > 0) {
      const ids = toDelete.map(r => r['id']).filter(Boolean);
      await this.enforceOnDeletePolicies(collection, ids, client);
    }

    const start = Date.now();
    let count: number;
    try {
      count = await client.delete(collection, query);
    } catch (err) {
      this.logger?.error('Delete failed', { collection, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
    this.logger?.debug('Delete', { collection, operation: 'delete', durationMs: Date.now() - start });

    await this.fireHooks({ collection, event: 'afterDelete', query, result: count, transaction: txClient });

    return count;
  }

  // ─── onDelete Policy Enforcement ───────────────────────────────────

  private async enforceOnDeletePolicies(
    collection: string,
    ids: unknown[],
    client: DatabaseAdapter | TransactionClient,
  ): Promise<void> {
    if (ids.length === 0) return;

    // Find all collections that reference this collection via relation fields
    for (const schema of this.registry.getAll()) {
      for (const field of schema.fields) {
        if (field.type !== 'relation' || !field.relation) continue;
        if (field.relation.target !== collection) continue;

        const rel = field.relation;
        const policy: OnDeletePolicy = rel.onDelete ?? 'setNull';
        const fk = rel.foreignKey ?? `${field.name}_id`;

        if (rel.type === 'manyToOne' || rel.type === 'oneToOne') {
          const relQuery: QueryAST = {
            filters: { and: [{ field: fk, operator: 'in', value: ids }] },
          };

          if (policy === 'restrict') {
            const related = await client.findMany(schema.name, relQuery);
            if (related.length > 0) {
              throw new EngineError(
                `Kan niet verwijderen: er zijn nog ${related.length} gekoppelde ${schema.name} records`,
                'RESTRICT_VIOLATION',
                409,
              );
            }
          } else if (policy === 'cascade') {
            const related = await client.findMany(schema.name, relQuery);
            if (related.length > 0) {
              await client.delete(schema.name, relQuery);
            }
          } else {
            // setNull (default)
            const related = await client.findMany(schema.name, relQuery);
            if (related.length > 0) {
              await client.update(schema.name, relQuery, { [fk]: null });
            }
          }
        } else if (rel.type === 'oneToMany') {
          const fkOneToMany = rel.foreignKey ?? `${collection}_id`;
          const relQuery: QueryAST = {
            filters: { and: [{ field: fkOneToMany, operator: 'in', value: ids }] },
          };

          if (policy === 'restrict') {
            const related = await client.findMany(schema.name, relQuery);
            if (related.length > 0) {
              throw new EngineError(
                `Kan niet verwijderen: er zijn nog ${related.length} gekoppelde ${schema.name} records`,
                'RESTRICT_VIOLATION',
                409,
              );
            }
          } else if (policy === 'cascade') {
            const related = await client.findMany(schema.name, relQuery);
            if (related.length > 0) {
              await client.delete(schema.name, relQuery);
            }
          } else {
            // setNull
            const related = await client.findMany(schema.name, relQuery);
            if (related.length > 0) {
              await client.update(schema.name, relQuery, { [fkOneToMany]: null });
            }
          }
        }
        // manyToMany junction cleanup is handled by DB-level CASCADE on junction tables
      }
    }
  }

  // ─── CE-007: Relation Population ──────────────────────────────────

  private buildPopulateDefinitions(
    schema: CollectionSchema,
    populate: Array<string | PopulateOption>,
  ): PopulateDefinition[] {
    const defs: PopulateDefinition[] = [];

    for (const pop of populate) {
      const fieldName = typeof pop === 'string' ? pop : pop.field;
      const field = schema.fields.find(f => f.name === fieldName);

      if (!field || !field.relation) {
        throw new EngineError(`Field "${fieldName}" is not a relation on collection "${schema.name}"`, 'INVALID_POPULATE');
      }

      defs.push({
        field: fieldName,
        collection: field.relation.target,
        foreignKey: field.relation.foreignKey ?? `${fieldName}_id`,
        type: field.relation.type,
        junctionTable: field.relation.junctionTable,
        select: typeof pop === 'object' ? pop.select : undefined,
      });
    }

    return defs;
  }

  private async populateResults(
    collection: string,
    results: Record<string, unknown>[],
    populate: Array<string | PopulateOption>,
    txClient: TransactionClient | undefined,
    depth: number,
  ): Promise<void> {
    if (depth >= 2 || results.length === 0) return;

    const schema = this.getSchema(collection);

    for (const pop of populate) {
      const fieldName = typeof pop === 'string' ? pop : pop.field;
      const field = schema.fields.find(f => f.name === fieldName);
      if (!field?.relation) continue;

      const rel = field.relation;
      const nestedPopulate = typeof pop === 'object' ? pop.populate : undefined;

      if (rel.type === 'manyToOne' || rel.type === 'oneToOne') {
        // Collect foreign key values
        const fk = rel.foreignKey ?? `${fieldName}_id`;
        const ids = [...new Set(results.map(r => r[fk]).filter(Boolean))];
        if (ids.length === 0) continue;

        const relQuery: QueryAST = { filters: { and: [{ field: 'id', operator: 'in', value: ids }] } };
        const client = txClient ?? this.adapter;
        const related = await client.findMany(rel.target, relQuery);
        const byId = new Map(related.map(r => [r['id'], r]));

        for (const row of results) {
          row[fieldName] = byId.get(row[fk]) ?? null;
        }

        if (nestedPopulate && nestedPopulate.length > 0) {
          await this.populateResults(rel.target, related, nestedPopulate, txClient, depth + 1);
        }
      } else if (rel.type === 'oneToMany') {
        const fk = rel.foreignKey ?? `${collection}_id`;
        const ids = [...new Set(results.map(r => r['id']).filter(Boolean))];
        if (ids.length === 0) continue;

        const relQuery: QueryAST = { filters: { and: [{ field: fk, operator: 'in', value: ids }] } };
        const client = txClient ?? this.adapter;
        const related = await client.findMany(rel.target, relQuery);

        const byFk = new Map<unknown, Record<string, unknown>[]>();
        for (const r of related) {
          const key = r[fk];
          if (!byFk.has(key)) byFk.set(key, []);
          byFk.get(key)!.push(r);
        }

        for (const row of results) {
          row[fieldName] = byFk.get(row['id']) ?? [];
        }

        if (nestedPopulate && nestedPopulate.length > 0) {
          await this.populateResults(rel.target, related, nestedPopulate, txClient, depth + 1);
        }
      } else if (rel.type === 'manyToMany') {
        const junction = rel.junctionTable;
        if (!junction) continue;

        const ids = [...new Set(results.map(r => r['id']).filter(Boolean))];
        if (ids.length === 0) continue;

        const sourceKey = `${collection}_id`;
        const targetKey = `${rel.target}_id`;
        const client = txClient ?? this.adapter;

        const junctionRows = await client.findMany(junction, {
          filters: { and: [{ field: sourceKey, operator: 'in', value: ids }] },
        });

        const targetIds = [...new Set(junctionRows.map(j => j[targetKey]).filter(Boolean))];
        if (targetIds.length === 0) {
          for (const row of results) { row[fieldName] = []; }
          continue;
        }

        const related = await client.findMany(rel.target, {
          filters: { and: [{ field: 'id', operator: 'in', value: targetIds }] },
        });
        const byId = new Map(related.map(r => [r['id'], r]));

        const bySource = new Map<unknown, Record<string, unknown>[]>();
        for (const j of junctionRows) {
          const src = j[sourceKey];
          if (!bySource.has(src)) bySource.set(src, []);
          const target = byId.get(j[targetKey]);
          if (target) bySource.get(src)!.push(target);
        }

        for (const row of results) {
          row[fieldName] = bySource.get(row['id']) ?? [];
        }

        if (nestedPopulate && nestedPopulate.length > 0) {
          await this.populateResults(rel.target, related, nestedPopulate, txClient, depth + 1);
        }
      }
    }
  }

  // ─── CE-008: Transactions ─────────────────────────────────────────

  async transaction<T>(fn: (engine: DataEngine) => Promise<T>): Promise<T> {
    return this.adapter.transaction(async (trx) => {
      // Create a transaction-scoped engine that passes the trx client to all operations
      const txEngine = new TransactionScopedEngine(this.registry, this.adapter, trx, this.hooks, this.defaultLimit, this.logger);
      return fn(txEngine);
    });
  }
}

/**
 * A DataEngine wrapper that routes all CRUD through a TransactionClient
 */
class TransactionScopedEngine extends DataEngine {
  private txClient: TransactionClient;

  constructor(
    registry: SchemaRegistry,
    adapter: DatabaseAdapter,
    txClient: TransactionClient,
    hooks: Map<string, Map<HookEvent, HookFunction[]>>,
    defaultLimit: number,
    logger?: Logger,
  ) {
    super(registry, adapter, { defaultLimit, logger });
    this.txClient = txClient;
    // Copy hooks from parent
    for (const [col, evtMap] of hooks) {
      for (const [evt, handlers] of evtMap) {
        for (const h of handlers) {
          this.registerHook(col, evt, h);
        }
      }
    }
  }

  override async create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return super.create(collection, data, this.txClient);
  }

  override async findMany(
    collection: string,
    query?: QueryAST,
    populate?: Array<string | PopulateOption>,
  ): Promise<Record<string, unknown>[]> {
    return super.findMany(collection, query, populate, this.txClient);
  }

  override async findOne(
    collection: string,
    query?: QueryAST,
    populate?: Array<string | PopulateOption>,
  ): Promise<Record<string, unknown> | null> {
    return super.findOne(collection, query, populate, this.txClient);
  }

  override async update(
    collection: string,
    query: QueryAST,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    return super.update(collection, query, data, this.txClient);
  }

  override async delete(
    collection: string,
    query: QueryAST,
    options?: { deleteAll?: boolean },
  ): Promise<number> {
    return super.delete(collection, query, options, this.txClient);
  }

  override async transaction<T>(_fn: (engine: DataEngine) => Promise<T>): Promise<T> {
    // Nested transactions just reuse the same client
    return _fn(this);
  }
}
