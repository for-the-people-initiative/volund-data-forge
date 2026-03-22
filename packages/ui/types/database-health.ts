export interface DatabaseHealth {
  adapter: string
  version: string
  host: string
  database: string
  status: 'connected' | 'slow' | 'disconnected' | 'not_configured'
  latencyMs: number
  connectedSince?: string
  error?: string
}
