/**
 * Shared Zod schemas for API validation.
 * Used by route handlers via readValidatedBody / getValidatedRouterParams.
 */
import { z } from 'zod'

// ─── Common Schemas ─────────────────────────────────────────────────

/** Pagination query params (limit, offset) */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

/** ID router param (numeric) */
export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

/** Name router param (string, e.g., collection name) */
export const NameParamSchema = z.object({
  name: z.string().min(1),
})

// ─── Webhook Schemas ────────────────────────────────────────────────

/** Valid webhook event types */
export const WebhookEventSchema = z.enum(['create', 'update', 'delete', 'all'])

/** POST /api/webhooks body */
export const WebhookCreateSchema = z.object({
  collection: z.string().min(1),
  event: WebhookEventSchema,
  url: z.string().url(),
  secret: z.string().min(8),
})

/** PATCH /api/webhooks/:id body */
export const WebhookToggleSchema = z.object({
  active: z.boolean(),
})

// ─── Schema Metadata ────────────────────────────────────────────────

/** PATCH /api/schemas/:name body */
export const SchemaPatchSchema = z
  .object({
    description: z.string().optional(),
    icon: z.string().optional(),
  })
  .refine((d) => d.description !== undefined || d.icon !== undefined, {
    message: 'At least one field (description or icon) is required',
  })

/** POST /api/schemas body */
export const SchemaCreateSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Schema name must start with a letter and contain only lowercase letters, numbers, and underscores',
  }),
})

// ─── Activity Log ───────────────────────────────────────────────────

/** GET /api/activity query params */
export const ActivityQuerySchema = z.object({
  collection: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// ─── Search ─────────────────────────────────────────────────────────

/** GET /api/search query params */
export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

// ─── Type Exports ───────────────────────────────────────────────────

export type Pagination = z.infer<typeof PaginationSchema>
export type IdParam = z.infer<typeof IdParamSchema>
export type NameParam = z.infer<typeof NameParamSchema>
export type WebhookCreate = z.infer<typeof WebhookCreateSchema>
export type WebhookToggle = z.infer<typeof WebhookToggleSchema>
export type SchemaPatch = z.infer<typeof SchemaPatchSchema>
export type SchemaCreate = z.infer<typeof SchemaCreateSchema>
export type ActivityQuery = z.infer<typeof ActivityQuerySchema>
export type SearchQuery = z.infer<typeof SearchQuerySchema>
