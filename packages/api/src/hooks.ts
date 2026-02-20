/**
 * AL-004: Lifecycle Hooks — Registry + Executor
 */

import type { HookFn, HookRegistry, HookContext, HookEvent } from './types.js'
import type { CollectionSchema, HookReference } from '@data-engine/schema'

// ─── Default Hook Registry ───────────────────────────────────────────

export class DefaultHookRegistry implements HookRegistry {
  private hooks = new Map<string, HookFn>()

  register(name: string, fn: HookFn): void {
    this.hooks.set(name, fn)
  }

  resolve(name: string): HookFn | undefined {
    return this.hooks.get(name)
  }
}

// ─── Hook Executor ───────────────────────────────────────────────────

export async function executeHooks(
  schema: CollectionSchema,
  event: HookEvent,
  ctx: HookContext,
  registry: HookRegistry | undefined,
): Promise<void> {
  if (!registry || !schema.hooks) return

  // Map schema hook events to our hook events (schema uses beforeCreate etc, we add beforeRead/afterRead)
  const matching: HookReference[] = schema.hooks.filter((h) => h.event === (event as string))

  for (const hookRef of matching) {
    const fn = registry.resolve(hookRef.handler)
    if (!fn) continue

    const isBefore = event.startsWith('before')
    try {
      await fn(ctx)
    } catch (err) {
      if (isBefore) {
        throw err // beforeX aborts operation
      }
      // afterX: log warning, don't abort
      console.warn(`[api] afterHook "${hookRef.handler}" failed:`, err)
    }
  }
}
