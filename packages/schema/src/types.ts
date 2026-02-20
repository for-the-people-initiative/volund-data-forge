// SE-001: Canonical JSON Schema Format

/** Relation cardinality types */
export type RelationType = 'oneToOne' | 'manyToOne' | 'oneToMany' | 'manyToMany';

/** Field-level validation rule */
export interface FieldValidation {
  rule: string;
  value?: unknown;
  message?: string;
}

/** Field definition */
export interface FieldDefinition {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  validations?: FieldValidation[];
  /** For 'select' type */
  options?: string[];
  /** For 'relation' type */
  relation?: RelationDefinition;
}

/** Relation definition */
export interface RelationDefinition {
  target: string;
  type: RelationType;
  foreignKey?: string;
  junctionTable?: string;
}

/** Hook reference (by name, not implementation) */
export interface HookReference {
  event: 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';
  handler: string;
}

/** UI namespace for frontend hints */
export interface UINamespace {
  icon?: string;
  displayTemplate?: string;
  hidden?: boolean;
  group?: string;
  sort?: number;
}

/** Collection metadata */
export interface CollectionMetadata {
  singleton?: boolean;
  timestamps?: boolean;
  softDelete?: boolean;
  [key: string]: unknown;
}

/** Complete collection schema */
export interface CollectionSchema {
  name: string;
  fields: FieldDefinition[];
  relations?: RelationDefinition[];
  hooks?: HookReference[];
  ui?: UINamespace;
  metadata?: CollectionMetadata;
}

/** Reserved system-managed fields */
export const RESERVED_FIELDS = ['id', 'created_at', 'updated_at'] as const;
export type ReservedField = typeof RESERVED_FIELDS[number];

/** Schema validation error */
export interface SchemaError {
  path: string;
  message: string;
}

/** Validation result for data validation (SE-006) */
export interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
  data?: Record<string, unknown>;
}

/** Schema diff operation types (SE-005) */
export type DiffOperation = 'added' | 'removed' | 'changed';

export interface FieldDiff {
  field: string;
  operation: DiffOperation;
  oldValue?: Partial<FieldDefinition>;
  newValue?: Partial<FieldDefinition>;
  destructive?: boolean;
  renameHint?: string;
}

export interface SchemaDiff {
  collection: string;
  changes: FieldDiff[];
  hasDestructiveChanges: boolean;
}

/** Storage interface for schema persistence (SE-004) */
export interface SchemaStorage {
  load(): Promise<CollectionSchema[]>;
  save(schema: CollectionSchema): Promise<void>;
  remove(name: string): Promise<void>;
}
