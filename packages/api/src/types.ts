/**
 * @data-engine/api — Core Types
 */

import type { QueryAST } from '@data-engine/adapter';

// ─── Engine Interface ────────────────────────────────────────────────

export interface EngineInterface {
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  findMany(collection: string, query?: QueryAST, populate?: string[]): Promise<Record<string, unknown>[]>;
  findOne(collection: string, query?: QueryAST, populate?: string[]): Promise<Record<string, unknown> | null>;
  update(collection: string, query: QueryAST, data: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  delete(collection: string, query: QueryAST): Promise<number>;
}

// ─── Request / Response ──────────────────────────────────────────────

export interface RequestContext {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[] | Record<string, unknown>>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiSuccessListResponse {
  data: Record<string, unknown>[];
  meta: { total: number; page?: number; limit?: number };
}

export interface ApiSuccessSingleResponse {
  data: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export type ApiResponse = {
  status: number;
  body: ApiSuccessListResponse | ApiSuccessSingleResponse | ApiErrorResponse | null;
  headers?: Record<string, string>;
};

// ─── Route Handler ───────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteHandler {
  method: HttpMethod;
  path: string;
  handler: (req: RequestContext) => Promise<ApiResponse>;
}

// ─── Hooks ───────────────────────────────────────────────────────────

export type HookEvent =
  | 'beforeCreate' | 'afterCreate'
  | 'beforeRead' | 'afterRead'
  | 'beforeUpdate' | 'afterUpdate'
  | 'beforeDelete' | 'afterDelete';

export type HookFn = (ctx: HookContext) => Promise<void>;

export interface HookContext {
  collection: string;
  event: HookEvent;
  data?: Record<string, unknown>;
  query?: QueryAST;
  result?: unknown;
}

export interface HookRegistry {
  resolve(name: string): HookFn | undefined;
  register(name: string, fn: HookFn): void;
}
