import { defineEventHandler, getRouterParam, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const language = getRouterParam(event, 'language') || 'typescript'
  const query = getQuery(event)
  const schemaName = typeof query.schema === 'string' ? query.schema : undefined

  // Fetch collections from schema endpoint
  const host = event.node.req.headers.host || 'localhost:9002'
  const protocol = event.node.req.headers['x-forwarded-proto'] || 'http'
  const schemaUrl = `${protocol}://${host}/api/schema${schemaName ? `?schema=${schemaName}` : ''}`

  let collections: string[] = []
  try {
    const res = await fetch(schemaUrl)
    if (res.ok) {
      const data = await res.json() as Array<{ name: string }>
      collections = data.map((c) => c.name)
    }
  } catch {
    collections = ['contacts', 'companies']
  }

  if (collections.length === 0) {
    collections = ['contacts', 'companies']
  }

  const firstCol = collections[0]
  const pascalFirst = firstCol.charAt(0).toUpperCase() + firstCol.slice(1)
  const imports = collections.map((c) => `${c.charAt(0).toUpperCase() + c.slice(1)}Api`).join(', ')
  const projectName = schemaName || 'data-engine'

  if (language === 'typescript') {
    return {
      helloWorld: `// Hello World — ${projectName} SDK
import { Configuration, ${imports} } from '../sdk/src/index'

const config = new Configuration({
  basePath: process.env.VDF_API_URL || 'http://localhost:9002',
})

async function main() {
  console.log('🔥 Connecting to ${projectName}...\\n')

  const api = new ${pascalFirst}Api(config)
  const result = await api.list${pascalFirst}()
  const records = result.data || []
  console.log(\`✅ Found \${records.length} ${firstCol} records\`)

  console.log('\\n🎉 SDK is working!')
}

main().catch(console.error)`,
      quickStart: [
        'npm install',
        'cp .env.example .env',
        'npx tsx src/index.ts',
      ],
      testCommand: 'npx vitest run',
      collections,
    }
  }

  // Generic preview for unsupported languages
  return {
    helloWorld: `// ${language} SDK — coming soon`,
    quickStart: [],
    testCommand: '',
    collections,
  }
})
