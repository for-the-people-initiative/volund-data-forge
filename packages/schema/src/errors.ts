/**
 * Base error classes for @data-engine
 *
 * All errors extend DataEngineError which provides:
 * - code: unique string identifier (e.g. 'VALIDATION_FAILED')
 * - statusCode: HTTP status code for API mapping
 * - details: optional structured data
 * - toJSON(): serializable representation
 */

export class DataEngineError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = 'DataEngineError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

// ─── Validation ──────────────────────────────────────────────────────

export class ValidationError extends DataEngineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_FAILED', 400, details)
    this.name = 'ValidationError'
  }
}

// ─── Not Found ───────────────────────────────────────────────────────

export class NotFoundError extends DataEngineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

// ─── Conflict ────────────────────────────────────────────────────────

export class ConflictError extends DataEngineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details)
    this.name = 'ConflictError'
  }
}

// ─── Adapter ─────────────────────────────────────────────────────────

export class AdapterError extends DataEngineError {
  constructor(
    message: string,
    code: string = 'ADAPTER_ERROR',
    cause?: unknown,
    details?: Record<string, unknown>,
  ) {
    super(message, code, 500, details, cause)
    this.name = 'AdapterError'
  }
}

export class ConnectionError extends AdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONNECTION_ERROR', cause)
    this.name = 'ConnectionError'
  }
}

export class SchemaOperationError extends AdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SCHEMA_ERROR', cause)
    this.name = 'SchemaOperationError'
  }
}

export class QueryError extends AdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, 'QUERY_ERROR', cause)
    this.name = 'QueryError'
  }
}

// ─── Config ──────────────────────────────────────────────────────────

export class ConfigError extends DataEngineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', 500, details)
    this.name = 'ConfigError'
  }
}

// ─── Migration ───────────────────────────────────────────────────────

export class MigrationError extends DataEngineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MIGRATION_ERROR', 500, details)
    this.name = 'MigrationError'
  }
}

// ─── Engine ──────────────────────────────────────────────────────────

export class EngineError extends DataEngineError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    details?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, details)
    this.name = 'EngineError'
  }
}

// ─── Query Parse ─────────────────────────────────────────────────────

export class QueryParseError extends ValidationError {
  constructor(message: string) {
    super(message, { type: 'query_parse' })
    this.name = 'QueryParseError'
  }
}

export class QueryCompilationError extends ValidationError {
  constructor(message: string) {
    super(message, { type: 'query_compilation' })
    this.name = 'QueryCompilationError'
  }
}
