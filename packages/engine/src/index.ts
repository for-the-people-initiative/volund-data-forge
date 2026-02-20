// @data-engine/engine — public API

// CE-001: QueryAST types (re-exported from adapter)
export type {
  QueryAST,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  SortClause,
  SortDirection,
  PopulateDefinition,
  TransactionClient,
} from './types.js';

// Engine-specific types
export type {
  HookEvent,
  HookFunction,
  HookContext,
  EngineOptions,
  PopulateOption,
} from './types.js';

// CE-002: Query Compiler
export { validateQuery, QueryCompilationError } from './query-compiler.js';

// CE-003 through CE-008: DataEngine
export { DataEngine, EngineError } from './engine.js';

// FW-CONFIG: Bootstrap
export { createDataEngine } from './bootstrap.js';
export type { DataEngineConfig, DataEngineInstance } from './bootstrap.js';
