/**
 * Nitro plugin: Initialize Data Engine with SQLite in-memory.
 * Sets up schema registry, adapter, engine, and seeds test data.
 */
import { SchemaRegistry } from '@data-engine/schema';
import { KnexAdapter } from '@data-engine/adapter-knex';
import { DataEngine } from '@data-engine/engine';
import { setEngine } from '../utils/engine';
const contactsSchema = {
    name: 'contacts',
    fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true, unique: true },
        { name: 'status', type: 'select', options: ['active', 'inactive', 'pending'] },
    ],
    metadata: { timestamps: true },
};
export default defineNitroPlugin(async () => {
    console.log('[data-engine] Initializing...');
    // 1. Schema Registry
    const registry = new SchemaRegistry();
    await registry.register(contactsSchema);
    console.log('[data-engine] Schema "contacts" registered');
    // 2. SQLite in-memory adapter
    // Cast config: KnexAdapterConfig type doesn't support better-sqlite3 natively
    const adapter = new KnexAdapter({
        client: 'better-sqlite3',
        database: ':memory:',
    });
    await adapter.connect();
    console.log('[data-engine] SQLite in-memory connected');
    // 3. Create table
    await adapter.createCollection('contacts', contactsSchema.fields);
    console.log('[data-engine] Table "contacts" created');
    // 4. Engine
    const engine = new DataEngine(registry, adapter);
    // 5. Seed data — use adapter directly to avoid engine's UUID id generation
    //    (SQLite uses integer autoincrement for id)
    const seeds = [
        { name: 'Alice van den Berg', email: 'alice@example.com', status: 'active' },
        { name: 'Bob de Vries', email: 'bob@example.com', status: 'inactive' },
        { name: 'Charlie Jansen', email: 'charlie@example.com', status: 'pending' },
        { name: 'Diana Bakker', email: 'diana@example.com', status: 'active' },
    ];
    for (const seed of seeds) {
        await adapter.create('contacts', seed);
    }
    console.log(`[data-engine] Seeded ${seeds.length} contacts`);
    // 6. Export globally
    setEngine(engine, registry, adapter);
    console.log('[data-engine] ✅ Ready');
});
//# sourceMappingURL=data-engine.js.map