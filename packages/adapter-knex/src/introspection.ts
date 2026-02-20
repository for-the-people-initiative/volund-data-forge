/**
 * DA-005: Database Introspection — reads current DB schema via Knex.
 * Supports PostgreSQL and SQLite.
 */

import type { Knex } from 'knex';
import type { DatabaseSchema, TableSchema, ColumnInfo, ForeignKeyInfo, IndexInfo, FieldType } from '@data-engine/adapter';
import { nativeTypeToFieldType } from './type-mapping.js';

/** Tables prefixed with _de_ are engine-managed metadata tables */
const ENGINE_PREFIX = '_de_';

function isSQLite(knex: Knex): boolean {
  // knex.client is typed as `any` in Knex's own type definitions
  const knexClient: { config?: { client?: string } } | undefined = knex.client;
  const client = knexClient?.config?.client ?? '';
  return client === 'sqlite3' || client === 'better-sqlite3';
}

export async function introspectDatabase(knex: Knex): Promise<DatabaseSchema> {
  const tables = isSQLite(knex) ? await getTablesSQLite(knex) : await getTablesPg(knex);
  const result: TableSchema[] = [];

  for (const tableName of tables) {
    if (tableName.startsWith(ENGINE_PREFIX)) continue;

    let columns, foreignKeys, indexes;
    if (isSQLite(knex)) {
      columns = await getColumnsSQLite(knex, tableName);
      foreignKeys = await getForeignKeysSQLite(knex, tableName);
      indexes = await getIndexesSQLite(knex, tableName);
    } else {
      [columns, foreignKeys, indexes] = await Promise.all([
        getColumnsPg(knex, tableName),
        getForeignKeysPg(knex, tableName),
        getIndexesPg(knex, tableName),
      ]);
    }

    result.push({ name: tableName, columns, foreignKeys, indexes });
  }

  return { tables: result };
}

// ─── SQLite implementations ─────────────────────────────────────────

async function getTablesSQLite(knex: Knex): Promise<string[]> {
  const rows = await knex.raw(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  return (Array.isArray(rows) ? rows : rows.rows ?? []).map((r: any) => r.name);
}

async function getColumnsSQLite(knex: Knex, table: string): Promise<ColumnInfo[]> {
  const rows = await knex.raw(`PRAGMA table_info(\`${table}\`)`);
  const cols: Record<string, unknown>[] = Array.isArray(rows) ? rows : (rows as { rows?: Record<string, unknown>[] }).rows ?? [];
  return cols.map((r: any) => ({
    name: r.name,
    type: nativeTypeToFieldType(r.type?.toLowerCase() ?? 'text'),
    nativeType: r.type ?? 'TEXT',
    nullable: r.notnull === 0,
    defaultValue: r.dflt_value,
    primaryKey: r.pk === 1,
    unique: r.pk === 1, // simplified; full unique detection would need index inspection
  }));
}

async function getForeignKeysSQLite(knex: Knex, table: string): Promise<ForeignKeyInfo[]> {
  const rows = await knex.raw(`PRAGMA foreign_key_list("${table}")`);
  const fks = Array.isArray(rows) ? rows : rows.rows ?? [];
  return fks.map((r: any) => ({
    column: r.from,
    referencedTable: r.table,
    referencedColumn: r.to,
    onDelete: r.on_delete,
    onUpdate: r.on_update,
  }));
}

async function getIndexesSQLite(knex: Knex, table: string): Promise<IndexInfo[]> {
  const rows = await knex.raw(`PRAGMA index_list("${table}")`);
  const idxList = Array.isArray(rows) ? rows : rows.rows ?? [];
  const result: IndexInfo[] = [];
  for (const idx of idxList) {
    const infoRows = await knex.raw(`PRAGMA index_info("${idx.name}")`);
    const info = Array.isArray(infoRows) ? infoRows : infoRows.rows ?? [];
    result.push({
      name: idx.name,
      columns: info.map((i: any) => i.name),
      unique: idx.unique === 1,
    });
  }
  return result;
}

// ─── PostgreSQL implementations ─────────────────────────────────────

async function getTablesPg(knex: Knex): Promise<string[]> {
  const result = await knex.raw<{ rows: Array<{ tablename: string }> }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  return result.rows.map(r => r.tablename);
}

async function getColumnsPg(knex: Knex, table: string): Promise<ColumnInfo[]> {
  const result = await knex.raw<{ rows: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }> }>(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ?
     ORDER BY ordinal_position`,
    [table]
  );

  const pkResult = await knex.raw<{ rows: Array<{ column_name: string }> }>(
    `SELECT a.attname as column_name
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = ?::regclass AND i.indisprimary`,
    [table]
  );
  const pkColumns = new Set(pkResult.rows.map(r => r.column_name));

  const uniqueResult = await knex.raw<{ rows: Array<{ column_name: string }> }>(
    `SELECT a.attname as column_name
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = ?::regclass AND i.indisunique AND NOT i.indisprimary
     AND array_length(i.indkey, 1) = 1`,
    [table]
  );
  const uniqueColumns = new Set(uniqueResult.rows.map(r => r.column_name));

  return result.rows.map(row => ({
    name: row.column_name,
    type: nativeTypeToFieldType(row.data_type),
    nativeType: row.data_type,
    nullable: row.is_nullable === 'YES',
    defaultValue: row.column_default,
    primaryKey: pkColumns.has(row.column_name),
    unique: uniqueColumns.has(row.column_name) || pkColumns.has(row.column_name),
  }));
}

async function getForeignKeysPg(knex: Knex, table: string): Promise<ForeignKeyInfo[]> {
  const result = await knex.raw<{ rows: Array<{
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
    delete_rule: string;
    update_rule: string;
  }> }>(
    `SELECT
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name,
       rc.delete_rule,
       rc.update_rule
     FROM information_schema.key_column_usage kcu
     JOIN information_schema.referential_constraints rc
       ON kcu.constraint_name = rc.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON rc.unique_constraint_name = ccu.constraint_name
     WHERE kcu.table_schema = 'public' AND kcu.table_name = ?`,
    [table]
  );

  return result.rows.map(row => ({
    column: row.column_name,
    referencedTable: row.foreign_table_name,
    referencedColumn: row.foreign_column_name,
    onDelete: row.delete_rule,
    onUpdate: row.update_rule,
  }));
}

async function getIndexesPg(knex: Knex, table: string): Promise<IndexInfo[]> {
  const result = await knex.raw<{ rows: Array<{
    indexname: string;
    indexdef: string;
    is_unique: boolean;
  }> }>(
    `SELECT
       i.relname as indexname,
       pg_get_indexdef(i.oid) as indexdef,
       ix.indisunique as is_unique
     FROM pg_class t
     JOIN pg_index ix ON t.oid = ix.indrelid
     JOIN pg_class i ON i.oid = ix.indexid
     WHERE t.relname = ? AND NOT ix.indisprimary`,
    [table]
  );

  return result.rows.map(row => {
    const match = row.indexdef.match(/\(([^)]+)\)/);
    const columns = match ? match[1].split(',').map(c => c.trim()) : [];
    return {
      name: row.indexname,
      columns,
      unique: row.is_unique,
    };
  });
}
