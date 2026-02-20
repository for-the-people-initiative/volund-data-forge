/**
 * Nitro plugin: Initialize Data Engine via createDataEngine().
 * CRM Template: contacts + companies with manyToOne relation.
 */
import { createDataEngine } from '@data-engine/engine';
import type { DataEngineInstance } from '@data-engine/engine';
import { createConsoleLogger } from '@data-engine/schema';
import type { CollectionSchema } from '@data-engine/schema';
import { setEngine } from '../utils/engine';

const companiesSchema: CollectionSchema = {
  name: 'companies',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'industry', type: 'select', options: ['Technologie', 'Finance', 'Gezondheidszorg', 'Retail', 'Onderwijs', 'Overheid'] },
    { name: 'website', type: 'text' },
    { name: 'city', type: 'text' },
  ],
  metadata: { timestamps: true },
};

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
};

let instance: DataEngineInstance | null = null;

export default defineNitroPlugin(async (nitroApp) => {
  const logger = createConsoleLogger();
  logger.info('[data-engine] Initializing CRM template...');

  // 1. Bootstrap engine
  instance = await createDataEngine({
    database: {
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      primaryKey: 'auto-increment',
    },
    options: { logger },
  });

  const { engine, registry, adapter, apiRouter } = instance;

  // 2. Register schemas (companies first — target of relation)
  await registry.register(companiesSchema);
  logger.info('[data-engine] Schema "companies" registered');

  await registry.register(contactsSchema);
  logger.info('[data-engine] Schema "contacts" registered');

  // 3. Create tables
  await adapter.createCollection('companies', companiesSchema.fields);
  await adapter.createCollection('contacts', contactsSchema.fields);

  // 4. Seed companies
  const companiesSeeds = [
    { name: 'TechNova BV', industry: 'Technologie', website: 'https://technova.nl', city: 'Amsterdam' },
    { name: 'FinanceFlow', industry: 'Finance', website: 'https://financeflow.nl', city: 'Rotterdam' },
    { name: 'MediCare Plus', industry: 'Gezondheidszorg', website: 'https://medicareplus.nl', city: 'Utrecht' },
    { name: 'RetailConnect', industry: 'Retail', website: 'https://retailconnect.nl', city: 'Den Haag' },
    { name: 'EduForward', industry: 'Onderwijs', website: 'https://eduforward.nl', city: 'Eindhoven' },
  ];

  for (const seed of companiesSeeds) {
    await adapter.create('companies', seed);
  }
  logger.info(`[data-engine] Seeded ${companiesSeeds.length} companies`);

  // 5. Seed contacts (with company relation)
  const contactsSeeds = [
    { name: 'Alice van den Berg', email: 'alice@example.com', status: 'active', company: '1' },
    { name: 'Bob de Vries', email: 'bob@example.com', status: 'inactive', company: '2' },
    { name: 'Charlie Jansen', email: 'charlie@example.com', status: 'pending', company: '1' },
    { name: 'Diana Bakker', email: 'diana@example.com', status: 'active', company: '3' },
    { name: 'Erik Smit', email: 'erik@example.com', status: 'active', company: '4' },
    { name: 'Femke de Groot', email: 'femke@example.com', status: 'pending', company: '5' },
  ];

  for (const seed of contactsSeeds) {
    await adapter.create('contacts', seed);
  }
  logger.info(`[data-engine] Seeded ${contactsSeeds.length} contacts`);

  // 6. Export engine + apiRouter for server routes
  setEngine(engine, registry, adapter, apiRouter);
  logger.info('[data-engine] ✅ CRM Ready');

  // 7. Cleanup on shutdown
  nitroApp.hooks.hook('close', async () => {
    logger.info('[data-engine] Shutting down...');
    await instance?.destroy();
    instance = null;
  });
});
