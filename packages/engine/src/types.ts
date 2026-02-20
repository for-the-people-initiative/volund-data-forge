/**
 * CE-001: Re-export QueryAST from adapter + engine-specific types
 */

// Re-export QueryAST and related types from adapter
export type {
  QueryAST,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  SortClause,
  SortDirection,
  PopulateDefinition,
  TransactionClient,
} from '@data-engine/adapter';

// ─── Hook Types ──────────────────────────────────────────────────────

export type HookEvent =
  | 'beforeCreate' | 'afterCreate'
  | 'beforeRead' | 'afterRead'
  | 'beforeUpdate' | 'afterUpdate'
  | 'beforeDelete' | 'afterDelete';

export interface HookContext {
  collection: string;
  event: HookEvent;
  data?: Record<string, unknown>;
  query?: import('@data-engine/adapter').QueryAST;
  result?: unknown;
  transaction?: import('@data-engine/adapter').TransactionClient;
}

export type HookFunction = (ctx: HookContext) => Promise<void> | void;

// ─── Engine Options ──────────────────────────────────────────────────

export interface EngineOptions {
  /** Default limit for findMany (default: 100) */
  defaultLimit?: number;
  /** Optional logger instance */
  logger?: import('@data-engine/schema').Logger;
}

// ─── Populate Options ────────────────────────────────────────────────

export interface PopulateOption {
  field: string;
  select?: string[];
  populate?: PopulateOption[];
}
