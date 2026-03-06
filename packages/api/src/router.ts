/**
 * AL-001: Auto-generate REST endpoints from schema registry
 * AL-002: Query param parsing integration
 * AL-003: Response format integration
 * AL-004: Hook integration
 */

import type { SchemaRegistry, CollectionSchema } from '@data-engine/schema'
import { DataEngineError, applyComputedFields, applyComputedFieldsToMany } from '@data-engine/schema'
import type { QueryAST, DatabaseAdapter } from '@data-engine/adapter'
import type { EngineInterface, RequestContext, ApiResponse, RouteHandler } from './types.js'
import { parseQueryParams } from './query-parser.js'
import { successList, successSingle, notFound, serverError, errorResponse } from './response.js'

/** Strip hidden fields from a record */
function stripFields(record: Record<string, unknown>, hiddenFields?: string[]): Record<string, unknown> {
  if (!hiddenFields?.length) return record
  const result = { ...record }
  for (const f of hiddenFields) {
    delete result[f]
  }
  return result
}

/** Check if a specific operation is enabled for a collection */
function isOperationEnabled(schema: CollectionSchema, op: 'list' | 'read' | 'create' | 'update' | 'delete'): boolean {
  if (schema.api?.enabled === false) return false
  return schema.api?.operations?.[op] !== false
}

export class ApiRouter {
  private engine: EngineInterface
  private registry: SchemaRegistry
  private adapter?: DatabaseAdapter

  constructor(engine: EngineInterface, registry: SchemaRegistry, adapter?: DatabaseAdapter) {
    this.engine = engine
    this.registry = registry
    this.adapter = adapter
  }

  /**
   * Apply schema from request context, execute fn, then restore.
   */
  private async withSchema<T>(req: RequestContext, fn: () => Promise<T>): Promise<T> {
    const schema = req.query['schema'] as string | undefined
    if (!schema || !this.adapter) return fn()

    const prev = this.adapter.getSchema()
    try {
      this.adapter.setSchema(schema)
      return await fn()
    } finally {
      this.adapter.setSchema(prev)
    }
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
    if (!isOperationEnabled(schema, 'list')) return errorResponse(403, 'OPERATION_DISABLED', `List operation is disabled for "${schema.name}"`)

    return this.withSchema(req, async () => {
      try {
        const { ast, populate } = parseQueryParams(req.query)
        const data = await this.engine.findMany(schema.name, ast, populate)
        const enriched = applyComputedFieldsToMany(data, schema.fields)
        const hidden = schema.api?.hiddenFields
        const result = hidden?.length ? enriched.map(r => stripFields(r, hidden)) : enriched
        const page = req.query['page'] ? Number(req.query['page']) : undefined
        const limit = ast.limit
        return successList(result, { total: result.length, page, limit })
      } catch (err) {
        return this.mapError(err)
      }
    })
  }

  private async handleFindOne(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')
    if (!isOperationEnabled(schema, 'read')) return errorResponse(403, 'OPERATION_DISABLED', `Read operation is disabled for "${schema.name}"`)

    return this.withSchema(req, async () => {
      try {
        const id = req.params['id']
        const { populate } = parseQueryParams(req.query)
        const query: QueryAST = { filters: { and: [{ field: 'id', operator: 'eq', value: id }] } }

        const data = await this.engine.findOne(schema.name, query, populate)
        if (!data) return notFound('Record not found')

        const enriched = applyComputedFields(data, schema.fields)
        return successSingle(stripFields(enriched, schema.api?.hiddenFields))
      } catch (err) {
        return this.mapError(err)
      }
    })
  }

  private async handleCreate(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')
    if (!isOperationEnabled(schema, 'create')) return errorResponse(403, 'OPERATION_DISABLED', `Create operation is disabled for "${schema.name}"`)

    return this.withSchema(req, async () => {
      try {
        const body = stripFields((req.body ?? {}) as Record<string, unknown>, schema.api?.hiddenFields)
        const created = await this.engine.create(schema.name, body)
        return successSingle(stripFields(created, schema.api?.hiddenFields), 201)
      } catch (err) {
        return this.mapError(err)
      }
    })
  }

  private async handleUpdate(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')
    if (!isOperationEnabled(schema, 'update')) return errorResponse(403, 'OPERATION_DISABLED', `Update operation is disabled for "${schema.name}"`)

    return this.withSchema(req, async () => {
      try {
        const id = req.params['id']
        const body = stripFields((req.body ?? {}) as Record<string, unknown>, schema.api?.hiddenFields)
        const query: QueryAST = { filters: { and: [{ field: 'id', operator: 'eq', value: id }] } }

        const updated = await this.engine.update(schema.name, query, body)
        if (updated.length === 0) return notFound('Record not found')

        return successSingle(stripFields(updated[0]!, schema.api?.hiddenFields))
      } catch (err) {
        return this.mapError(err)
      }
    })
  }

  private async handleDelete(req: RequestContext): Promise<ApiResponse> {
    const schema = this.resolveSchema(req)
    if (!schema) return notFound('Collection not found')
    if (!isOperationEnabled(schema, 'delete')) return errorResponse(403, 'OPERATION_DISABLED', `Delete operation is disabled for "${schema.name}"`)

    return this.withSchema(req, async () => {
      try {
        const id = req.params['id']
        const query: QueryAST = { filters: { and: [{ field: 'id', operator: 'eq', value: id }] } }

        const count = await this.engine.delete(schema.name, query)
        if (count === 0) return notFound('Record not found')

        return { status: 204, body: null }
      } catch (err) {
        return this.mapError(err)
      }
    })
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
