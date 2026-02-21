/**
 * Schema Validation Tests — validates the schema validator logic
 */

import { describe, it, expect } from 'vitest';
import { validateSchema } from '@data-engine/schema';
import type { CollectionSchema } from '@data-engine/schema';

describe('Schema Validation', () => {
  it('valid schema passes', () => {
    const schema: CollectionSchema = {
      name: 'products',
      singularName: 'product',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'price', type: 'float' },
      ],
    };
    expect(validateSchema(schema)).toHaveLength(0);
  });

  it('empty collection name rejected', () => {
    const schema: CollectionSchema = { name: '', singularName: 'item', fields: [{ name: 'x', type: 'text' }] };
    const errors = validateSchema(schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.path === 'name')).toBe(true);
  });

  it('missing singularName rejected', () => {
    const schema: CollectionSchema = { name: 'items', fields: [{ name: 'x', type: 'text' }] } as any;
    const errors = validateSchema(schema);
    expect(errors.some(e => e.path === 'singularName' && e.message.includes('required'))).toBe(true);
  });

  it('empty singularName rejected', () => {
    const schema: CollectionSchema = { name: 'items', singularName: '', fields: [{ name: 'x', type: 'text' }] };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.path === 'singularName' && e.message.includes('non-empty'))).toBe(true);
  });

  it('whitespace-only singularName rejected', () => {
    const schema: CollectionSchema = { name: 'items', singularName: '   ', fields: [{ name: 'x', type: 'text' }] };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.path === 'singularName' && e.message.includes('non-empty'))).toBe(true);
  });

  it('invalid collection name format rejected', () => {
    const schema: CollectionSchema = { name: 'My Collection!', singularName: 'item', fields: [{ name: 'x', type: 'text' }] };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('lowercase'))).toBe(true);
  });

  it('reserved field name "id" rejected', () => {
    const schema: CollectionSchema = {
      name: 'bad',
      singularName: 'bad_item',
      fields: [{ name: 'id', type: 'text' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('reserved'))).toBe(true);
  });

  it('reserved field name "created_at" rejected', () => {
    const schema: CollectionSchema = {
      name: 'bad',
      singularName: 'bad_item',
      fields: [{ name: 'created_at', type: 'text' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('reserved'))).toBe(true);
  });

  it('reserved field name "updated_at" rejected', () => {
    const schema: CollectionSchema = {
      name: 'bad',
      singularName: 'bad_item',
      fields: [{ name: 'updated_at', type: 'text' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('reserved'))).toBe(true);
  });

  it('duplicate field names rejected', () => {
    const schema: CollectionSchema = {
      name: 'dupes',
      singularName: 'dupe',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'title', type: 'text' },
      ],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
  });

  it('unknown field type rejected', () => {
    const schema: CollectionSchema = {
      name: 'bad_type',
      singularName: 'bad_item',
      fields: [{ name: 'x', type: 'unicorn' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('Unknown type'))).toBe(true);
  });

  it('relation field must have relation definition', () => {
    const schema: CollectionSchema = {
      name: 'no_rel_def',
      singularName: 'item',
      fields: [{ name: 'owner', type: 'relation' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('relation definition'))).toBe(true);
  });

  it('relation field must have valid target', () => {
    const schema: CollectionSchema = {
      name: 'bad_target',
      singularName: 'bad_item',
      fields: [
        { name: 'owner', type: 'relation', relation: { target: 'nonexistent', type: 'manyToOne' } },
      ],
    };
    const errors = validateSchema(schema, ['products']);
    expect(errors.some(e => e.message.includes('does not exist'))).toBe(true);
  });

  it('self-referential relation is allowed', () => {
    const schema: CollectionSchema = {
      name: 'categories',
      singularName: 'category',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'parent', type: 'relation', relation: { target: 'categories', type: 'manyToOne' } },
      ],
    };
    const errors = validateSchema(schema);
    expect(errors).toHaveLength(0);
  });

  it('lookup field must reference existing relation field', () => {
    const schema: CollectionSchema = {
      name: 'bad_lookup',
      singularName: 'bad_item',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'lookup_val', type: 'lookup', lookup: { relation: 'missing_rel', field: 'name' } },
      ],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('not a relation field'))).toBe(true);
  });

  it('lookup referencing non-relation field is rejected', () => {
    const schema: CollectionSchema = {
      name: 'bad_lookup2',
      singularName: 'bad_item',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'lookup_val', type: 'lookup', lookup: { relation: 'title', field: 'name' } },
      ],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('not a relation field'))).toBe(true);
  });

  it('select field must have options', () => {
    const schema: CollectionSchema = {
      name: 'no_opts',
      singularName: 'no_opt',
      fields: [{ name: 'color', type: 'select' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('at least one option'))).toBe(true);
  });

  it('field without name is rejected', () => {
    const schema: CollectionSchema = {
      name: 'no_field_name',
      singularName: 'no_field_item',
      fields: [{ name: '', type: 'text' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('Field name is required'))).toBe(true);
  });

  it('field without type is rejected', () => {
    const schema: CollectionSchema = {
      name: 'no_field_type',
      singularName: 'no_type_item',
      fields: [{ name: 'x', type: '' }],
    };
    const errors = validateSchema(schema);
    expect(errors.some(e => e.message.includes('Field type is required'))).toBe(true);
  });
});
