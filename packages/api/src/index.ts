/**
 * @data-engine/api — API Layer
 *
 * Auto-generates REST endpoints from the schema registry.
 */

export { ApiRouter } from './router.js'
export { createH3Router } from './h3-adapter.js'
export type { H3AdapterOptions } from './h3-adapter.js'
export { parseQueryParams, QueryParseError } from './query-parser.js'
export {
  successList,
  successSingle,
  errorResponse,
  notFound,
  badRequest,
  validationError,
  serverError,
} from './response.js'

export { generateOpenApiSpec } from './openapi.js'

export type {
  EngineInterface,
  RequestContext,
  ApiResponse,
  ApiSuccessListResponse,
  ApiSuccessSingleResponse,
  ApiErrorResponse,
  ApiErrorDetail,
  RouteHandler,
  HttpMethod,
} from './types.js'
