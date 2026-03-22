/**
 * Schema field as returned by the useSchema composable.
 * This extends the base FieldDefinition with resolved labels.
 */
export interface SchemaField {
  name: string
  type: string
  label?: string
  required?: boolean
  default?: unknown
  options?: string[]
  unique?: boolean
  relation?: {
    target: string
    type: string
    foreignKey?: string
  }
  validations?: Array<{
    rule: string
    value?: unknown
    message?: string
  }>
}

/**
 * Column definition used by filter fields and table columns.
 */
export interface FilterField {
  name: string
  type: string
  label?: string
  options?: string[]
}
