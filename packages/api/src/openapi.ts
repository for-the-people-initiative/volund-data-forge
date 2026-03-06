/**
 * OpenAPI 3.0.3 spec generator from SchemaRegistry collections.
 */

import type { SchemaRegistry } from '@data-engine/schema'
import type { CollectionSchema, FieldDefinition } from '@data-engine/schema'

interface OpenApiOptions {
  title?: string
  version?: string
  schemaName?: string
  pathPrefix?: string
}

function fieldToJsonSchema(field: FieldDefinition): Record<string, unknown> {
  switch (field.type) {
    case 'text':
      return { type: 'string' }
    case 'integer':
      return { type: 'integer' }
    case 'float':
      return { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'datetime':
      return { type: 'string', format: 'date-time' }
    case 'json':
      return { type: 'object' }
    case 'email':
      return { type: 'string', format: 'email' }
    case 'select':
      return { type: 'string', ...(field.options?.length ? { enum: field.options } : {}) }
    case 'relation':
      return { type: 'string', format: 'uuid', description: 'UUID reference' }
    case 'lookup':
      return { type: 'string', readOnly: true }
    case 'computed':
      return { type: 'string', readOnly: true }
    default:
      return { type: 'string' }
  }
}

function buildSchemas(collection: CollectionSchema) {
  const name = collection.name
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1)
  const hiddenFields = new Set(collection.api?.hiddenFields ?? [])

  const properties: Record<string, Record<string, unknown>> = {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  }

  const inputProperties: Record<string, Record<string, unknown>> = {}
  const required: string[] = []

  for (const field of collection.fields) {
    if (hiddenFields.has(field.name)) continue

    const schema = fieldToJsonSchema(field)
    properties[field.name] = schema

    if (field.type !== 'lookup' && field.type !== 'computed') {
      inputProperties[field.name] = { ...schema }
      delete inputProperties[field.name].readOnly
    }

    if (field.required) {
      required.push(field.name)
    }
  }

  return {
    [`${pascalName}`]: {
      type: 'object',
      properties,
    },
    [`${pascalName}Input`]: {
      type: 'object',
      properties: inputProperties,
      ...(required.length ? { required } : {}),
    },
  }
}

function isOpEnabled(collection: CollectionSchema, op: string): boolean {
  return (collection.api?.operations as Record<string, boolean | undefined>)?.[op] !== false
}

function buildPaths(collection: CollectionSchema, pathPrefix?: string) {
  const name = collection.name
  const pascalName = name.charAt(0).toUpperCase() + name.slice(1)
  const tag = pascalName
  const basePath = pathPrefix ? `${pathPrefix}/${name}/records` : `/api/collections/${name}/records`

  const listPath: Record<string, unknown> = {}
  const itemPath: Record<string, unknown> = {}

  if (isOpEnabled(collection, 'list')) {
    listPath['get'] = {
      tags: [tag],
      summary: `List ${name} records`,
      operationId: `list${pascalName}`,
      parameters: [
        { name: 'filter', in: 'query', schema: { type: 'string' }, description: 'Filter expression' },
        { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'Sort field (prefix with - for desc)' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Max records' },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Offset' },
      ],
      responses: {
        '200': {
          description: 'List of records',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: `#/components/schemas/${pascalName}` } },
                  meta: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  }

  if (isOpEnabled(collection, 'create')) {
    listPath['post'] = {
      tags: [tag],
      summary: `Create ${name} record`,
      operationId: `create${pascalName}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${pascalName}Input` },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created record',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${pascalName}` },
                },
              },
            },
          },
        },
      },
    }
  }

  if (isOpEnabled(collection, 'read')) {
    itemPath['get'] = {
      tags: [tag],
      summary: `Get ${name} record by ID`,
      operationId: `get${pascalName}`,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': {
          description: 'Single record',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${pascalName}` },
                },
              },
            },
          },
        },
        '404': { description: 'Not found' },
      },
    }
  }

  if (isOpEnabled(collection, 'update')) {
    itemPath['put'] = {
      tags: [tag],
      summary: `Update ${name} record`,
      operationId: `update${pascalName}`,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${pascalName}Input` },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated record',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${pascalName}` },
                },
              },
            },
          },
        },
        '404': { description: 'Not found' },
      },
    }
  }

  if (isOpEnabled(collection, 'delete')) {
    itemPath['delete'] = {
      tags: [tag],
      summary: `Delete ${name} record`,
      operationId: `delete${pascalName}`,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '204': { description: 'Deleted' },
        '404': { description: 'Not found' },
      },
    }
  }

  const result: Record<string, unknown> = {}
  if (Object.keys(listPath).length > 0) result[basePath] = listPath
  if (Object.keys(itemPath).length > 0) result[`${basePath}/{id}`] = itemPath
  return result
}

export function generateOpenApiSpec(
  registry: SchemaRegistry,
  options?: OpenApiOptions,
): object {
  const title = options?.title ?? 'Data Engine API'
  const version = options?.version ?? '1.0.0'

  const collections = registry.getAll(options?.schemaName).filter(c => c.api?.enabled !== false)

  let paths: Record<string, unknown> = {}
  let schemas: Record<string, unknown> = {}

  for (const col of collections) {
    Object.assign(paths, buildPaths(col, options?.pathPrefix))
    Object.assign(schemas, buildSchemas(col))
  }

  return {
    openapi: '3.0.3',
    info: { title, version },
    paths,
    components: { schemas },
    tags: collections.map((c) => ({
      name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
      description: `CRUD operations for ${c.name}`,
    })),
  }
}
