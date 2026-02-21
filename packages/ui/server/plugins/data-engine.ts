/**
 * Nitro plugin: Initialize Data Engine with persistent SQLite storage.
 * CRM Template: contacts + companies with manyToOne relation.
 */
import { createDataEngine } from '@data-engine/engine'
import type { DataEngineInstance } from '@data-engine/engine'
import { createConsoleLogger } from '@data-engine/schema'
import type { CollectionSchema } from '@data-engine/schema'
import { setEngine, setMigrationManager } from '../utils/engine'
import { initWebhooks, fireWebhooks } from '../utils/webhooks'
import { ensureActivityLog } from '../utils/activity-log'
import { MigrationManager } from '@data-engine/migration'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Seed Schemas ────────────────────────────────────────────────────

const companiesSchema: CollectionSchema = {
  name: 'companies',
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'industry',
      type: 'select',
      options: ['Technologie', 'Finance', 'Gezondheidszorg', 'Retail', 'Onderwijs', 'Overheid'],
    },
    { name: 'website', type: 'text' },
    { name: 'city', type: 'text' },
  ],
  metadata: { timestamps: true },
}

const contactsSchema: CollectionSchema = {
  name: 'contacts',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'status', type: 'select', options: ['active', 'inactive', 'pending'] },
    {
      name: 'company',
      type: 'relation',
      relation: {
        target: 'companies',
        type: 'manyToOne',
        foreignKey: 'company_id',
      },
    },
  ],
  metadata: { timestamps: true },
}

// ─── Seed Data ───────────────────────────────────────────────────────

const companiesSeeds = [
  {
    name: 'TechNova BV',
    industry: 'Technologie',
    website: 'https://technova.nl',
    city: 'Amsterdam',
  },
  {
    name: 'FinanceFlow',
    industry: 'Finance',
    website: 'https://financeflow.nl',
    city: 'Rotterdam',
  },
  {
    name: 'MediCare Plus',
    industry: 'Gezondheidszorg',
    website: 'https://medicareplus.nl',
    city: 'Utrecht',
  },
  {
    name: 'RetailConnect',
    industry: 'Retail',
    website: 'https://retailconnect.nl',
    city: 'Den Haag',
  },
  {
    name: 'EduForward',
    industry: 'Onderwijs',
    website: 'https://eduforward.nl',
    city: 'Eindhoven',
  },
]

const contactsSeeds = [
  { name: 'Alice van den Berg', email: 'alice@example.com', status: 'active', company: '1' },
  { name: 'Bob de Vries', email: 'bob@example.com', status: 'inactive', company: '2' },
  { name: 'Charlie Jansen', email: 'charlie@example.com', status: 'pending', company: '1' },
  { name: 'Diana Bakker', email: 'diana@example.com', status: 'active', company: '3' },
  { name: 'Erik Smit', email: 'erik@example.com', status: 'active', company: '4' },
  { name: 'Femke de Groot', email: 'femke@example.com', status: 'pending', company: '5' },
]

// ─── Plugin ──────────────────────────────────────────────────────────

let instance: DataEngineInstance | null = null

export default defineNitroPlugin(async (nitroApp) => {
  const logger = createConsoleLogger()
  logger.info('[data-engine] Initializing with persistent storage...')

  // 1. Resolve data directory & ensure it exists
  const dataDir = process.env.DATA_DIR || resolve(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
    logger.info(`[data-engine] Created data directory: ${dataDir}`)
  }
  const dbPath = resolve(dataDir, 'volund.db')
  logger.info(`[data-engine] Database: ${dbPath}`)

  // 2. Bootstrap engine with file-based SQLite
  instance = await createDataEngine({
    database: {
      client: 'better-sqlite3',
      connection: { filename: dbPath },
      primaryKey: 'auto-increment',
    },
    options: { logger },
  })

  const { engine, registry, adapter, apiRouter, migrationManager } = instance

  // 3. Restore persisted schemas (from _schema_versions table)
  const persistedNames = await migrationManager.getPersistedCollectionNames()
  const internalCollections = new Set(['_schema_versions'])
  const restoredCollections = new Set<string>()

  for (const name of persistedNames) {
    if (internalCollections.has(name)) continue
    const snapshot = await migrationManager.getPersistedSnapshot(name)
    if (snapshot) {
      // applySchema will detect no diff → registers in registry without DDL
      await migrationManager.applySchema(snapshot)
      restoredCollections.add(name)
      logger.info(`[data-engine] Restored schema: ${name}`)
    }
  }

  // 4. Apply default schemas (companies + contacts) — idempotent via migration manager
  //    Use force:true to handle schema drift (e.g. fields added/removed via builder)
  await migrationManager.applySchema(companiesSchema, { force: true })
  if (!restoredCollections.has('companies')) {
    logger.info('[data-engine] Schema "companies" created')
  }

  await migrationManager.applySchema(contactsSchema, { force: true })
  if (!restoredCollections.has('contacts')) {
    logger.info('[data-engine] Schema "contacts" created')
  }

  // 5. Conditional seeding — only if tables are empty
  const existingCompanies = await adapter.findMany('companies', { limit: 1 })
  if (existingCompanies.length === 0) {
    for (const seed of companiesSeeds) {
      await adapter.create('companies', seed)
    }
    logger.info(`[data-engine] Seeded ${companiesSeeds.length} companies`)

    // Seed contacts only if companies were also seeded (they depend on company IDs)
    const existingContacts = await adapter.findMany('contacts', { limit: 1 })
    if (existingContacts.length === 0) {
      for (const seed of contactsSeeds) {
        await adapter.create('contacts', seed)
      }
      logger.info(`[data-engine] Seeded ${contactsSeeds.length} contacts`)
    }
  } else {
    logger.info('[data-engine] Data already exists, skipping seed')
  }

  // 6. Initialize activity log table
  await ensureActivityLog(adapter)
  logger.info('[data-engine] Activity log initialized')

  // 7. Initialize webhooks
  await initWebhooks(adapter)
  logger.info('[data-engine] Webhooks initialized')

  // Register webhook hooks on all collections
  const hookCollections = [...persistedNames, 'companies', 'contacts'].filter(
    (n) => !n.startsWith('_'),
  )
  for (const col of new Set(hookCollections)) {
    engine.registerHook(col, 'afterCreate', (ctx) => {
      fireWebhooks('create', ctx.collection, ctx.result)
    })
    engine.registerHook(col, 'afterUpdate', (ctx) => {
      fireWebhooks('update', ctx.collection, ctx.result)
    })
    engine.registerHook(col, 'afterDelete', (ctx) => {
      fireWebhooks('delete', ctx.collection, { query: ctx.query, count: ctx.result })
    })
  }

  // 7. Export engine + managers for server routes
  setMigrationManager(migrationManager)
  setEngine(engine, registry, adapter, apiRouter)
  logger.info('[data-engine] ✅ CRM Ready (persistent)')

  // 8. Cleanup on shutdown
  nitroApp.hooks.hook('close', async () => {
    logger.info('[data-engine] Shutting down...')
    await instance?.destroy()
    instance = null
  })
})
