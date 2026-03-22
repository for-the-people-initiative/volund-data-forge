/**
 * A record from any collection. Always has `id` (or `_id`),
 * plus dynamic fields depending on the schema.
 */
export interface CollectionRecord {
  id?: string
  _id?: string
  name?: string
  title?: string
  label?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

/**
 * Get the primary key from a record (id or _id).
 */
export function getRecordId(record: CollectionRecord): string {
  return String(record.id ?? record._id ?? '')
}

/**
 * Get a human-readable label from a record.
 */
export function getRecordLabel(record: CollectionRecord): string {
  return String(record.name ?? record.title ?? record.label ?? record.id ?? record._id ?? 'record')
}
