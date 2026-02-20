/**
 * FW-HTTP-001: H3 Adapter
 * Converts ApiRouter RouteHandlers → H3 event handlers for Nitro/Nuxt.
 */

import {
  createRouter,
  defineEventHandler,
  readBody,
  getQuery,
  getRouterParams,
  setResponseStatus,
  setResponseHeader,
  getRequestHeader,
  type Router as H3Router,
  type H3Event,
} from 'h3';
import type { ApiRouter } from './router.js';
import type { RequestContext, ApiResponse } from './types.js';
import type { Logger } from '@data-engine/schema';

// ─── Options ─────────────────────────────────────────────────────────

export interface H3AdapterOptions {
  /**
   * Base path prefix replacing the default /api prefix in route paths.
   * E.g. '/api/collections' maps /api/:collection → /api/collections/:collection
   * Default: '' (use route paths as-is)
   */
  basePath?: string;
  /** Logger for request logging */
  logger?: Logger;
  /** CORS origin (default: none / same-origin) */
  corsOrigin?: string | string[] | boolean;
}

// ─── H3 Event → RequestContext ───────────────────────────────────────

function eventToRequestContext(event: H3Event, method: string, path: string): RequestContext {
  const params = getRouterParams(event) ?? {};
  const rawQuery = getQuery(event) as Record<string, string | string[]>;

  // Normalize query values
  const query: Record<string, string | string[] | Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(rawQuery)) {
    query[k] = v;
  }

  const headers: Record<string, string> = {};
  const headerNames = ['content-type', 'authorization', 'accept', 'x-request-id'];
  for (const name of headerNames) {
    const val = getRequestHeader(event, name);
    if (val) headers[name] = val;
  }

  return { method, path, params, query, headers };
}

// ─── ApiResponse → H3 Response ──────────────────────────────────────

function sendApiResponse(event: H3Event, response: ApiResponse): unknown {
  setResponseStatus(event, response.status);
  setResponseHeader(event, 'content-type', 'application/json');
  return response.body;
}

// ─── CORS Headers ───────────────────────────────────────────────────

function applyCorsHeaders(event: H3Event, origin: string | string[] | boolean): void {
  let allowOrigin: string;
  if (origin === true) {
    allowOrigin = getRequestHeader(event, 'origin') ?? '*';
  } else if (Array.isArray(origin)) {
    const reqOrigin = getRequestHeader(event, 'origin') ?? '';
    allowOrigin = origin.includes(reqOrigin) ? reqOrigin : (origin[0] ?? '');
  } else {
    allowOrigin = origin || '';
  }

  setResponseHeader(event, 'access-control-allow-origin', allowOrigin);
  setResponseHeader(event, 'access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
  setResponseHeader(event, 'access-control-allow-headers', 'content-type,authorization');
  setResponseHeader(event, 'access-control-max-age', 86400);
}

// ─── Content-Type Validation ────────────────────────────────────────

function validateContentType(event: H3Event, method: string): ApiResponse | null {
  if (method === 'POST' || method === 'PUT') {
    const ct = getRequestHeader(event, 'content-type') ?? '';
    if (!ct.includes('application/json')) {
      return {
        status: 415,
        body: {
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Content-Type must be application/json',
          },
        },
      };
    }
  }
  return null;
}

// ─── Factory ─────────────────────────────────────────────────────────

/**
 * Convert an ApiRouter's dynamic routes into an H3 router.
 */
export type { H3Router };

export function createH3Router(
  apiRouter: ApiRouter,
  options: H3AdapterOptions = {},
): H3Router {
  const { basePath = '', logger, corsOrigin } = options;
  const router = createRouter();
  const routes = apiRouter.getDynamicRoutes();

  // Convert ApiRouter paths: replace /api prefix with basePath
  for (const route of routes) {
    const strippedPath = route.path.replace(/^\/api/, '');
    const h3Path = basePath + strippedPath;
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';

    router[method](
      h3Path,
      defineEventHandler(async (event: H3Event) => {
        // CORS
        if (corsOrigin) {
          applyCorsHeaders(event, corsOrigin);
        }

        // Content-Type validation
        const ctError = validateContentType(event, route.method);
        if (ctError) return sendApiResponse(event, ctError);

        // Build RequestContext
        const ctx = eventToRequestContext(event, route.method, route.path);

        // Read body for POST/PUT
        if (route.method === 'POST' || route.method === 'PUT') {
          try {
            ctx.body = await readBody(event);
          } catch {
            return sendApiResponse(event, {
              status: 400,
              body: { error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
            });
          }
        }

        // Request logging
        if (logger) {
          logger.info(`${route.method} ${h3Path}`, {
            params: ctx.params,
            query: ctx.query,
          });
        }

        // Execute handler
        const response = await route.handler(ctx);

        // Response logging
        if (logger) {
          logger.debug(`Response ${response.status}`, {
            path: h3Path,
            status: response.status,
          });
        }

        return sendApiResponse(event, response);
      }),
    );
  }

  // CORS preflight handler
  if (corsOrigin) {
    const preflightPaths = [...new Set(routes.map((r) => basePath + r.path.replace(/^\/api/, '')))];
    for (const path of preflightPaths) {
      router.options(
        path,
        defineEventHandler((event: H3Event) => {
          applyCorsHeaders(event, corsOrigin);
          setResponseStatus(event, 204);
          return '';
        }),
      );
    }
  }

  return router;
}
