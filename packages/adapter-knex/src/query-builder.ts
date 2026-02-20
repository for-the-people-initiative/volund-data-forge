/**
 * Translates QueryAST into Knex query builder calls.
 */

import type { Knex } from 'knex';
import { QueryError } from '@data-engine/adapter';
import type { QueryAST, FilterGroup, FilterCondition } from '@data-engine/adapter';

export function applyQueryAST(qb: Knex.QueryBuilder, query: QueryAST): Knex.QueryBuilder {
  if (query.filters) {
    qb = applyFilterGroup(qb, query.filters);
  }

  if (query.sort) {
    for (const s of query.sort) {
      qb = qb.orderBy(s.field, s.direction);
    }
  }

  if (query.limit !== undefined) {
    qb = qb.limit(query.limit);
  }

  if (query.offset !== undefined) {
    qb = qb.offset(query.offset);
  }

  if (query.select) {
    qb = qb.select(query.select);
  }

  return qb;
}

function applyFilterGroup(qb: Knex.QueryBuilder, group: FilterGroup): Knex.QueryBuilder {
  if (group.and) {
    for (const item of group.and) {
      if ('field' in item) {
        qb = applyCondition(qb, item, 'and');
      } else {
        qb = qb.where(function (this: Knex.QueryBuilder) {
          applyFilterGroup(this, item);
        });
      }
    }
  }

  if (group.or) {
    for (const item of group.or) {
      if ('field' in item) {
        qb = applyCondition(qb, item, 'or');
      } else {
        qb = qb.orWhere(function (this: Knex.QueryBuilder) {
          applyFilterGroup(this, item);
        });
      }
    }
  }

  return qb;
}

function applyCondition(
  qb: Knex.QueryBuilder,
  cond: FilterCondition,
  mode: 'and' | 'or',
): Knex.QueryBuilder {
  const where = mode === 'or' ? 'orWhere' : 'where';
  const whereNot = mode === 'or' ? 'orWhereNot' : 'whereNot';
  const whereIn = mode === 'or' ? 'orWhereIn' : 'whereIn';
  const whereNotIn = mode === 'or' ? 'orWhereNotIn' : 'whereNotIn';
  const whereNull = mode === 'or' ? 'orWhereNull' : 'whereNull';
  const whereNotNull = mode === 'or' ? 'orWhereNotNull' : 'whereNotNull';
  const whereBetween = mode === 'or' ? 'orWhereBetween' : 'whereBetween';

  switch (cond.operator) {
    case 'eq':
      return qb[where](cond.field, '=', cond.value as Knex.Value);
    case 'neq':
      return qb[whereNot](cond.field, '=', cond.value as Knex.Value);
    case 'gt':
      return qb[where](cond.field, '>', cond.value as Knex.Value);
    case 'gte':
      return qb[where](cond.field, '>=', cond.value as Knex.Value);
    case 'lt':
      return qb[where](cond.field, '<', cond.value as Knex.Value);
    case 'lte':
      return qb[where](cond.field, '<=', cond.value as Knex.Value);
    case 'in':
      return qb[whereIn](cond.field, cond.value as readonly Knex.Value[]);
    case 'nin':
      return qb[whereNotIn](cond.field, cond.value as readonly Knex.Value[]);
    case 'like':
      return qb[where](cond.field, 'like', cond.value as string);
    case 'ilike':
      return qb[where](cond.field, 'ilike', cond.value as string);
    case 'null':
      return qb[whereNull](cond.field);
    case 'notNull':
      return qb[whereNotNull](cond.field);
    case 'between':
      return qb[whereBetween](cond.field, cond.value as [Knex.Value, Knex.Value]);
    default:
      throw new QueryError(`Unsupported filter operator: ${cond.operator}`);
  }
}
