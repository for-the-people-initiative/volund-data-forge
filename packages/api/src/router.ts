/**
 * AL-001: Auto-generate REST endpoints from schema registry
 * AL-002: Query param parsing integration
 * AL-003: Response format integration
 * AL-004: Hook integration
 */

import type { SchemaRegistry, CollectionSchema } from '@data-engine/schema'
import { DataEngineError } from '@data-engine/schema'
import type { QueryAST } from '@data-engine/adapter'
import type { EngineInterface, RequestContext, ApiResponse, RouteHandler } from './types.js'
import { parseQueryParams } from './query-parser.js'
import { successList, successSingle, notFound, serverError, errorResponse } from './response.js'

export class ApiRouter {
  private engine: EngineInterface
  private registry: SchemaRegistry

  constructor(engine: EngineInterface, registry: SchemaRegistry) {
    this.engine = engine
    this.registry = registry
  }

  /**
   * Generate route handlers for all registered collections.
   * Call again when schemas change to get updated routes.
   */
  getRoutes(): RouteHandler[] {
    const routes: RouteHandler[] = []
    for (const schema of this.registry.getAll()) {
      routes.push(...this.collectionRoutes(schema))
    }
    return routes
  }

  /**
   * Single dynamic handler that resolves collection at request time.
   * This is the preferred approach — no need to regenerate routes.
   */
  getDynamicRoutes(): RouteHandler[] {
    return [
      { method: 'GET', path: '/api/:collection', handler: (req) => this.handleFindMany(req) },
      { method: 'GET', path: '/api/:collection/:id', handler: (req) => this.handleFindOne(req) },
      { method: 'POST', path: '/api/:collection', handler: (req) => this.handleCreate(req) },
      { method: 'PUT', path: '/api/:collection/:id', handler: (req) => this.handleUpdate(req) },
      { method: 'DELETE', path: '/api/:collection/:id', handler: (req) => this.handleDelete(req) },
    ]
  }

  // ─── Handlers ────────────────────────────────────────────────────

  private resolveSchema(req: RequestContext): CollectionSchema | null {
    const name = req.params['collection']
    if (!name) return null
    return this.registry.get(name) ?? null
  }

  private async handleFindMany(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')

    try {
      const { ast, populate } = parseQueryParams(req.query)
      const data = await this.engine.findMany(schema.name, ast, populate)
      const page = req.query['page'] ? Number(req.query['page']) : undefined
      const limit = ast.limit
      return successList(data, { total: data.length, page, limit })
    } catch (err) {
      return this.mapError(err)
    }
  }

  private async handleFindOne(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')

    try {
      const id = req.params['id']
      const { populate } = parseQueryParams(req.query)
      const query: QueryAST = { filters: { and: [{ field: 'id', operator: 'eq', value: id }] } }

      const data = await this.engine.findOne(schema.name, query, populate)
      if (!data) return notFound('Record not found')

      return successSingle(data)
    } catch (err) {
      return this.mapError(err)
    }
  }

  private async handleCreate(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')

    try {
      const body = (req.body ?? {}) as Record<string, unknown>
      const created = await this.engine.create(schema.name, body)
      return successSingle(created, 201)
    } catch (err) {
      return this.mapError(err)
    }
  }

  private async handleUpdate(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')

    try {
      const id = req.params['id']
      const body = (req.body ?? {}) as Record<string, unknown>
      const query: QueryAST = { filters: { and: [{ field: 'id', operator: 'eq', value: id }] } }

      const updated = await this.engine.update(schema.name, query, body)
      if (updated.length === 0) return notFound('Record not found')

      return successSingle(updated[0]!)
    } catch (err) {
      return this.mapError(err)
    }
  }

  private async handleDelete(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')

    try {
      const id = req.params['id']
      const query: QueryAST = { filters: { and: [{ field: 'id', operator: 'eq', value: id }] } }

      const count = await this.engine.delete(schema.name, query)
      if (count === 0) return notFound('Record not found')

      return { status: 204, body: null }
    } catch (err) {
      return this.mapError(err)
    }
  }

  // ─── Error Mapping ───────────────────────────────────────────────

  private mapError(err: unknown): ApiResponse {
    if (err instanceof DataEngineError) {
      return errorResponse(err.statusCode, err.code, err.message)
    }
    return serverError(err instanceof Error ? err.message : 'Unknown error')
  }

  // ─── Static per-collection routes (alternative to dynamic) ─────

  private collectionRoutes(schema: CollectionSchema): RouteHandler[] {
    const name = schema.name
    return [
      {
        method: 'GET',
        path: `/api/${name}`,
        handler: (req) => {
          req.params['collection'] = name
          return this.handleFindMany(req)
        },
      },
      {
        method: 'GET',
        path: `/api/${name}/:id`,
        handler: (req) => {
          req.params['collection'] = name
          return this.handleFindOne(req)
        },
      },
      {
        method: 'POST',
        path: `/api/${name}`,
        handler: (req) => {
          req.params['collection'] = name
          return this.handleCreate(req)
        },
      },
      {
        method: 'PUT',
        path: `/api/${name}/:id`,
        handler: (req) => {
          req.params['collection'] = name
          return this.handleUpdate(req)
        },
      },
      {
        method: 'DELETE',
        path: `/api/${name}/:id`,
        handler: (req) => {
          req.params['collection'] = name
          return this.handleDelete(req)
        },
      },
    ]
  }
}
