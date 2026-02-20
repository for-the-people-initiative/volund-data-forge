// SE-002: Universal Type System
import { ConfigError } from './errors.js'

export interface TypeDefinition {
  name: string
  validate(value: unknown): boolean
  defaultValue?: unknown
  constraints?: Record<string, unknown>
}

const registry = new Map<string, TypeDefinition>()

function registerBuiltins(): void {
  registerType({
    name: 'text',
    validate: (v) => typeof v === 'string',
    defaultValue: '',
  })

  registerType({
    name: 'integer',
    validate: (v) => typeof v === 'number' && Number.isInteger(v),
    defaultValue: 0,
  })

  registerType({
    name: 'float',
    validate: (v) => typeof v === 'number' && Number.isFinite(v),
    defaultValue: 0.0,
  })

  registerType({
    name: 'boolean',
    validate: (v) => typeof v === 'boolean',
    defaultValue: false,
  })

  registerType({
    name: 'datetime',
    validate: (v) => v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v))),
  })

  registerType({
    name: 'json',
    validate: (v) => v !== undefined && v !== null && typeof v === 'object',
  })

  registerType({
    name: 'relation',
    validate: (v) => typeof v === 'string' || typeof v === 'number',
  })

  registerType({
    name: 'select',
    validate: (v) => typeof v === 'string',
    defaultValue: '',
  })

  registerType({
    name: 'email',
    validate: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    defaultValue: '',
  })

  registerType({
    name: 'lookup',
    // Lookup fields are virtual/computed — any value is acceptable (resolved at query time)
    validate: () => true,
  })
}

export function registerType(type: TypeDefinition): void {
  registry.set(type.name, type)
}

export function getType(name: string): TypeDefinition {
  const type = registry.get(name)
  if (!type) {
    throw new ConfigError(
      `Unknown type "${name}". Available types: ${[...registry.keys()].join(', ')}`,
    )
  }
  return type
}

export function hasType(name: string): boolean {
  return registry.has(name)
}

export function getAllTypes(): TypeDefinition[] {
  return [...registry.values()]
}

// Initialize built-in types
registerBuiltins()
