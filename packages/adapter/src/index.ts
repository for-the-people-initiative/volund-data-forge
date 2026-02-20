/**
 * @data-engine/adapter — Database Adapter Interface (DA-001)
 *
 * Defines the contract that all database adapters must implement.
 */

import type { FieldDefinition, RelationType } from '@data-engine/schema';

// Re-export schema types used by adapters
export type { FieldDefinition, RelationType };

// ─── Field Type System ───────────────────────────────────────────────

export type FieldType = 'text' | 'integer' | 'float' | 'boolean' | 'datetime' | 'json' | 'relation' | 'select' | 'email';

// ─── Field Changes (for alterField) ─────────────────────────────────

export interface FieldChanges {
  rename?: string;
  type?: FieldType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  nullable?: boolean;
  options?: string[];          // for select type
}

// ─── Query AST ───────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin'
  | 'like' | 'ilike'
  | 'null' | 'notNull'
  | 'between';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface FilterGroup {
  and?: Array<FilterCondition | FilterGroup>;
  or?: Array<FilterCondition | FilterGroup>;
}

export type SortDirection = 'asc' | 'desc';

export interface SortClause {
  field: string;
  direction: SortDirection;
}

export interface QueryAST {
  filters?: FilterGroup;
  sort?: SortClause[];
  limit?: number;
  offset?: number;
  select?: string[];
}

// ─── Populate / Relations ────────────────────────────────────────────

export interface PopulateDefinition {
  field: string;
  collection: string;
  foreignKey: string;
  type: RelationType;
  junctionTable?: string;
  select?: string[];
  query?: QueryAST;
}

// ─── Introspection Types ─────────────────────────────────────────────

export interface ColumnInfo {
  name: string;
  type: FieldType;
  nativeType: string;
  nullable: boolean;
  defaultValue: unknown;
  primaryKey: boolean;
  unique: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
}

export interface DatabaseSchema {
  tables: TableSchema[];
}

// ─── Transaction Client ──────────────────────────────────────────────

export interface TransactionClient {
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  findMany(collection: string, query: QueryAST): Promise<Record<string, unknown>[]>;
  findOne(collection: string, query: QueryAST): Promise<Record<string, unknown> | null>;
  update(collection: string, query: QueryAST, data: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  delete(collection: string, query: QueryAST): Promise<number>;
}

// ─── Primary Key Strategy ────────────────────────────────────────────

export type PrimaryKeyStrategy = 'uuid' | 'auto-increment';

// ─── Database Adapter Interface ──────────────────────────────────────

export interface DatabaseAdapter {
  /** The primary key strategy used by this adapter */
  readonly primaryKeyStrategy: PrimaryKeyStrategy;
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Schema operations (runtime DDL)
  createCollection(name: string, fields: FieldDefinition[]): Promise<void>;
  addField(collection: string, field: FieldDefinition): Promise<void>;
  removeField(collection: string, fieldName: string): Promise<void>;
  alterField(collection: string, fieldName: string, changes: FieldChanges): Promise<void>;

  // CRUD
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  findMany(collection: string, query: QueryAST): Promise<Record<string, unknown>[]>;
  findOne(collection: string, query: QueryAST): Promise<Record<string, unknown> | null>;
  update(collection: string, query: QueryAST, data: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  delete(collection: string, query: QueryAST): Promise<number>;

  // Relations
  findWithRelations(collection: string, query: QueryAST, populate: PopulateDefinition[]): Promise<Record<string, unknown>[]>;

  // Transactions
  transaction<T>(fn: (trx: TransactionClient) => Promise<T>): Promise<T>;

  // Introspection
  introspect(): Promise<DatabaseSchema>;
}

// ─── Adapter Errors (re-exported from @data-engine/schema) ──────────

export {
  AdapterError,
  ConnectionError,
  SchemaOperationError,
  SchemaOperationError as SchemaError,
  QueryError,
} from '@data-engine/schema';
