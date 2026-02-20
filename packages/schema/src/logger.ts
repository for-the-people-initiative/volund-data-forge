/**
 * Pluggable Logger Interface (FW-LOG-001)
 */

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

/** Console-based logger factory */
export function createConsoleLogger(): Logger {
  const fmt = (level: string, message: string, context?: Record<string, unknown>): string => {
    const ts = new Date().toISOString()
    const ctx = context ? ` ${JSON.stringify(context)}` : ''
    return `[${ts}] ${level}: ${message}${ctx}`
  }

  return {
    debug: (msg, ctx) => console.debug(fmt('DEBUG', msg, ctx)),
    info: (msg, ctx) => console.info(fmt('INFO', msg, ctx)),
    warn: (msg, ctx) => console.warn(fmt('WARN', msg, ctx)),
    error: (msg, ctx) => console.error(fmt('ERROR', msg, ctx)),
  }
}

/** Silent logger factory (for tests) */
export function createSilentLogger(): Logger {
  const noop = () => {}
  return { debug: noop, info: noop, warn: noop, error: noop }
}
