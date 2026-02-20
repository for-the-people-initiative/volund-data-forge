// @data-engine/schema — public API

// SE-001: Types
export type {
  CollectionSchema,
  FieldDefinition,
  RelationDefinition,
  RelationType,
  FieldValidation,
  HookReference,
  UINamespace,
  CollectionMetadata,
  SchemaError,
  ValidationResult,
  SchemaStorage,
  DiffOperation,
  FieldDiff,
  SchemaDiff,
  ReservedField,
} from './types.js';
export { RESERVED_FIELDS } from './types.js';

// SE-002: Type System
export type { TypeDefinition } from './type-system.js';
export { registerType, getType, hasType, getAllTypes } from './type-system.js';

// SE-003: Schema Validator
export { validateSchema } from './validator.js';

// SE-004: Schema Registry
export { SchemaRegistry } from './registry.js';

// SE-005: Schema Diffing
export { diffSchemas } from './diff.js';

// SE-006: Data Validation
export type { ValidatorOptions, CompiledValidator } from './data-validator.js';
export { compileValidator } from './data-validator.js';

// UUID v7 Generator
export { generateUUIDv7 } from './uuid.js';

// Error Classes
export {
  DataEngineError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AdapterError,
  ConnectionError,
  SchemaOperationError,
  QueryError,
  ConfigError,
  MigrationError,
  EngineError,
  QueryParseError,
  QueryCompilationError,
} from './errors.js';

// Logger Interface (FW-LOG-001)
export type { Logger } from './logger.js';
export { createConsoleLogger, createSilentLogger } from './logger.js';
