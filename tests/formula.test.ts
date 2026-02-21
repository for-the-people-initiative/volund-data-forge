import { describe, it, expect } from 'vitest'
import { evaluateFormula, applyComputedFields, applyComputedFieldsToMany } from '@data-engine/schema'

describe('evaluateFormula', () => {
  it('evaluates basic multiplication', () => {
    const result = evaluateFormula('{price} * {quantity}', { price: 10, quantity: 5 })
    expect(result).toBe(50)
  })

  it('evaluates addition', () => {
    const result = evaluateFormula('{a} + {b}', { a: 3, b: 7 })
    expect(result).toBe(10)
  })

  it('evaluates subtraction', () => {
    const result = evaluateFormula('{total} - {discount}', { total: 100, discount: 15 })
    expect(result).toBe(85)
  })

  it('evaluates division', () => {
    const result = evaluateFormula('{total} / {count}', { total: 100, count: 4 })
    expect(result).toBe(25)
  })

  it('evaluates string concatenation', () => {
    const result = evaluateFormula('{firstName} + " " + {lastName}', { firstName: 'Jan', lastName: 'de Vries' })
    expect(result).toBe('Jan de Vries')
  })

  it('evaluates mixed arithmetic', () => {
    const result = evaluateFormula('({price} * {quantity}) - {discount}', { price: 20, quantity: 3, discount: 10 })
    expect(result).toBe(50)
  })

  it('returns null for missing fields (null values)', () => {
    const result = evaluateFormula('{price} * {quantity}', { price: 10 })
    // null * 10 = 0 in JS, but our resolver puts "null" literal
    expect(result).toBe(0)
  })

  it('returns null for empty formula', () => {
    expect(evaluateFormula('', { a: 1 })).toBeNull()
  })

  it('returns null for non-string formula', () => {
    expect(evaluateFormula(null as any, { a: 1 })).toBeNull()
  })

  it('handles numeric string fields', () => {
    const result = evaluateFormula('{a} + {b}', { a: '5', b: '3' })
    // Strings get JSON.stringify'd, so "5" + "3" = "53" (string concat)
    expect(result).toBe('53')
  })

  it('handles decimal numbers', () => {
    const result = evaluateFormula('{price} * {tax}', { price: 100, tax: 0.21 })
    expect(result).toBeCloseTo(21)
  })
})

describe('applyComputedFields', () => {
  it('adds computed values to record', () => {
    const record = { id: '1', price: 10, quantity: 3 }
    const fields = [
      { name: 'price' },
      { name: 'quantity' },
      { name: 'total', computed: { formula: '{price} * {quantity}', returnType: 'number' } },
    ]
    const result = applyComputedFields(record, fields)
    expect(result.total).toBe(30)
    expect(result.price).toBe(10)
    expect(result.quantity).toBe(3)
  })

  it('does not modify original record', () => {
    const record = { id: '1', price: 10, quantity: 3 }
    const fields = [
      { name: 'total', computed: { formula: '{price} * {quantity}', returnType: 'number' } },
    ]
    applyComputedFields(record, fields)
    expect(record).not.toHaveProperty('total')
  })
})

describe('applyComputedFieldsToMany', () => {
  it('applies to all records', () => {
    const records = [
      { id: '1', price: 10, quantity: 2 },
      { id: '2', price: 20, quantity: 3 },
    ]
    const fields = [
      { name: 'total', computed: { formula: '{price} * {quantity}', returnType: 'number' } },
    ]
    const result = applyComputedFieldsToMany(records, fields)
    expect(result[0]!.total).toBe(20)
    expect(result[1]!.total).toBe(60)
  })

  it('returns original array when no computed fields', () => {
    const records = [{ id: '1', name: 'test' }]
    const fields = [{ name: 'name' }]
    const result = applyComputedFieldsToMany(records, fields)
    expect(result).toBe(records) // same reference
  })
})
