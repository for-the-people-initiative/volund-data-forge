/**
 * CE-002: Query Compiler — validates QueryAST fields against schema
 */

import type { CollectionSchema } from '@data-engine/schema';
import type { QueryAST, FilterGroup, FilterCondition } from '@data-engine/adapter';

import { QueryCompilationError } from '@data-engine/schema';
export { QueryCompilationError };

/**
 * Validates a QueryAST against a collection schema.
 * Ensures all referenced fields exist in the schema.
 */
export function validateQuery(schema: CollectionSchema, query: QueryAST): void {
  const validFields = new Set<string>([
    'id', 'created_at', 'updated_at',
    ...schema.fields.map(f => f.name),
  ]);

  // Validate select fields
  if (query.select) {
    for (const field of query.select) {
      if (!validFields.has(field)) {
        throw new QueryCompilationError(`Unknown field "${field}" in select for collection "${schema.name}"`);
      }
    }
  }

  // Validate sort fields
  if (query.sort) {
    for (const clause of query.sort) {
      if (!validFields.has(clause.field)) {
        throw new QueryCompilationError(`Unknown field "${clause.field}" in sort for collection "${schema.name}"`);
      }
    }
  }

  // Validate filter fields
  if (query.filters) {
    validateFilterGroup(schema.name, validFields, query.filters);
  }
}

function validateFilterGroup(collection: string, validFields: Set<string>, group: FilterGroup): void {
  if (group.and) {
    for (const item of group.and) {
      if ('field' in item && 'operator' in item) {
        validateFilterCondition(collection, validFields, item as FilterCondition);
      } else {
        validateFilterGroup(collection, validFields, item as FilterGroup);
      }
    }
  }
  if (group.or) {
    for (const item of group.or) {
      if ('field' in item && 'operator' in item) {
        validateFilterCondition(collection, validFields, item as FilterCondition);
      } else {
        validateFilterGroup(collection, validFields, item as FilterGroup);
      }
    }
  }
}

function validateFilterCondition(collection: string, validFields: Set<string>, condition: FilterCondition): void {
  // Support nested field filtering (e.g., "relation.field") — only validate the root field
  const rootField = condition.field.split('.')[0];
  if (!validFields.has(rootField)) {
    throw new QueryCompilationError(`Unknown field "${condition.field}" in filter for collection "${collection}"`);
  }
}
