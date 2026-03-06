import { execSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface SdkOptions {
  language: string
  openApiSpecUrl: string
  outputDir: string
  apiBaseUrl: string
  schemaName?: string
}

export interface FieldInfo {
  name: string
  type: string
  required: boolean
  format?: string
  enumValues?: string[]
}

export interface CollectionInfo {
  name: string
  pascalName: string
  operations: string[]
  fields: FieldInfo[]
  inputModelName: string
}

export interface SdkResult {
  outputDir: string
  collections: CollectionInfo[]
  success: boolean
  error?: string
}

function pascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function extractCollections(spec: any): CollectionInfo[] {
  const tags: string[] = (spec.tags || []).map((t: any) => t.name)
  const collections: CollectionInfo[] = []

  for (const tag of tags) {
    const name = tag.charAt(0).toLowerCase() + tag.slice(1)
    const pName = pascalCase(name)
    const ops: string[] = []
    for (const [, methods] of Object.entries(spec.paths || {})) {
      for (const [, details] of Object.entries(methods as any)) {
        const d = details as any
        if (d.tags?.includes(tag)) ops.push(d.operationId)
      }
    }

    // Extract fields from Input schema
    const inputModelName = `${pName}Input`
    const inputSchema = spec.components?.schemas?.[inputModelName]
    const fields: FieldInfo[] = []
    const requiredFields: string[] = inputSchema?.required || []

    if (inputSchema?.properties) {
      for (const [fname, fdef] of Object.entries(inputSchema.properties)) {
        const fd = fdef as any
        fields.push({
          name: fname,
          type: fd.type || 'string',
          required: requiredFields.includes(fname),
          format: fd.format,
          enumValues: fd.enum,
        })
      }
    }

    collections.push({ name, pascalName: pName, operations: ops, fields, inputModelName })
  }
  return collections
}

/** Generate a sample value for a field */
function sampleValue(f: FieldInfo): string {
  if (f.enumValues?.length) return `'${f.enumValues[0]}'`
  if (f.format === 'email') return '`test-${Date.now()}@example.com`'
  if (f.format === 'uuid') return `undefined`
  if (f.format === 'date-time') return `new Date().toISOString()`
  if (f.type === 'integer') return '1'
  if (f.type === 'number') return '1.0'
  if (f.type === 'boolean') return 'true'
  return '`Test ' + f.name + ' ${Date.now()}`'
}

function sampleUpdateValue(f: FieldInfo): string {
  if (f.enumValues?.length) return `'${f.enumValues[f.enumValues.length > 1 ? 1 : 0]}'`
  if (f.format === 'email') return '`updated-${Date.now()}@example.com`'
  if (f.format === 'uuid') return `undefined`
  if (f.format === 'date-time') return `new Date().toISOString()`
  if (f.type === 'integer') return '2'
  if (f.type === 'number') return '2.0'
  if (f.type === 'boolean') return 'false'
  return '`Updated ' + f.name + ' ${Date.now()}`'
}

/** Build a TS object literal for creating a record */
function buildInputObject(col: CollectionInfo, updater = false): string {
  const valueFn = updater ? sampleUpdateValue : sampleValue
  const lines = col.fields
    .filter(f => f.format !== 'uuid') // skip relation fields
    .map(f => `      ${f.name}: ${valueFn(f)},`)
  return `{\n${lines.join('\n')}\n    }`
}

export async function generateSdk(options: SdkOptions): Promise<SdkResult> {
  const { language, openApiSpecUrl, outputDir, apiBaseUrl, schemaName } = options

  if (language !== 'typescript') {
    return { outputDir, collections: [], success: false, error: `Language '${language}' not yet supported` }
  }

  // 1. Fetch the OpenAPI spec
  const specResponse = await fetch(openApiSpecUrl)
  if (!specResponse.ok) {
    return { outputDir, collections: [], success: false, error: `Failed to fetch spec: ${specResponse.status}` }
  }
  const spec = await specResponse.json()
  const collections = extractCollections(spec)

  if (collections.length === 0) {
    return { outputDir, collections: [], success: false, error: 'No collections found in spec' }
  }

  // 2. Save spec to temp file
  const specFile = join(tmpdir(), `openapi-spec-${Date.now()}.json`)
  writeFileSync(specFile, JSON.stringify(spec, null, 2))

  // 3. Create output directory
  mkdirSync(outputDir, { recursive: true })

  // 4. Run openapi-generator-cli
  const sdkDir = join(outputDir, 'sdk')
  try {
    execSync(
      `npx @openapitools/openapi-generator-cli generate ` +
      `-g typescript-fetch ` +
      `-i "${specFile}" ` +
      `-o "${sdkDir}" ` +
      `--additional-properties=supportsES6=true,npmName=@vdf/sdk,typescriptThreePlus=true`,
      { stdio: 'pipe', timeout: 120_000 },
    )
  } catch (err: any) {
    return {
      outputDir, collections, success: false,
      error: `openapi-generator failed: ${err.stderr?.toString() || err.message}`,
    }
  }

  // 5. Generate wrapper files
  const projectName = schemaName || 'data-engine'
  // The OpenAPI paths already include /api/, so basePath should be the server root
  const serverBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '')

  writeFileSync(join(outputDir, 'package.json'), generatePackageJson(projectName))
  writeFileSync(join(outputDir, 'tsconfig.json'), generateTsConfig())
  writeFileSync(join(outputDir, '.env.example'), `VDF_API_URL=${serverBaseUrl}\n# VDF_API_KEY=your-api-key-here\n`)

  mkdirSync(join(outputDir, 'src'), { recursive: true })
  writeFileSync(join(outputDir, 'src', 'index.ts'), generateIndexTs(projectName, collections, serverBaseUrl))

  mkdirSync(join(outputDir, 'src', 'examples'), { recursive: true })
  writeFileSync(join(outputDir, 'src', 'examples', 'create-and-list.ts'), generateExampleTs(projectName, collections, serverBaseUrl))

  mkdirSync(join(outputDir, 'tests'), { recursive: true })
  writeFileSync(join(outputDir, 'tests', 'crud.test.ts'), generateTestTs(projectName, collections, serverBaseUrl))

  writeFileSync(join(outputDir, 'README.md'), generateReadme(projectName, collections, serverBaseUrl))

  return { outputDir, collections, success: true }
}

function generatePackageJson(projectName: string): string {
  return JSON.stringify({
    name: `${projectName}-sdk-app`,
    version: '1.0.0',
    scripts: {
      start: 'npx tsx src/index.ts',
      test: 'npx vitest run',
      'test:watch': 'npx vitest',
    },
    dependencies: {
      typescript: '^5.0.0',
      tsx: '^4.0.0',
    },
    devDependencies: {
      vitest: '^3.0.0',
    },
  }, null, 2) + '\n'
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ES2020',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: 'dist',
      rootDir: '.',
      declaration: true,
    },
    include: ['src/**/*', 'tests/**/*', 'sdk/**/*'],
  }, null, 2) + '\n'
}

function generateIndexTs(projectName: string, collections: CollectionInfo[], apiBaseUrl: string): string {
  const firstCol = collections[0]
  const imports = collections.map(c => `${c.pascalName}Api`).join(', ')

  return `// Hello World — ${projectName} SDK
import { Configuration, ${imports} } from '../sdk/src/index'

const config = new Configuration({
  basePath: process.env.VDF_API_URL || '${apiBaseUrl}',
})

async function main() {
  console.log('🔥 Connecting to ${projectName}...\\n')

  const api = new ${firstCol.pascalName}Api(config)
  const result = await api.list${firstCol.pascalName}()
  const records = result.data || []
  console.log(\`✅ Found \${records.length} ${firstCol.name} records\`)

  console.log('\\n🎉 SDK is working!')
}

main().catch(console.error)
`
}

function generateExampleTs(projectName: string, collections: CollectionInfo[], apiBaseUrl: string): string {
  const col = collections[0]
  const inputParam = col.name.charAt(0).toLowerCase() + col.name.slice(1)
  const createObj = buildInputObject(col)
  const updateObj = buildInputObject(col, true)

  return `// CRUD Example — ${projectName} SDK
import { Configuration, ${col.pascalName}Api } from '../../sdk/src/index'

const config = new Configuration({
  basePath: process.env.VDF_API_URL || '${apiBaseUrl}',
})

async function main() {
  const api = new ${col.pascalName}Api(config)

  // CREATE
  console.log('Creating a ${col.name} record...')
  const created = await api.create${col.pascalName}({
    ${col.inputModelName.charAt(0).toLowerCase() + col.inputModelName.slice(1)}: ${createObj}
  })
  console.log('Created:', created)

  // LIST
  console.log('\\nListing ${col.name} records...')
  const list = await api.list${col.pascalName}()
  console.log(\`Found \${(list.data || []).length} records\`)

  // UPDATE
  if (created.data?.id) {
    console.log('\\nUpdating record...')
    const updated = await api.update${col.pascalName}({
      id: String(created.data.id),
      ${col.inputModelName.charAt(0).toLowerCase() + col.inputModelName.slice(1)}: ${updateObj}
    })
    console.log('Updated:', updated)

    // DELETE
    console.log('\\nDeleting record...')
    await api.delete${col.pascalName}({ id: String(created.data.id) })
    console.log('Deleted!')
  }

  console.log('\\n🎉 CRUD lifecycle complete!')
}

main().catch(console.error)
`
}

function generateTestTs(projectName: string, collections: CollectionInfo[], apiBaseUrl: string): string {
  const imports = collections.map(c => `${c.pascalName}Api`).join(', ')

  const testBlocks = collections.map(col => {
    const inputKey = col.inputModelName.charAt(0).toLowerCase() + col.inputModelName.slice(1)
    const createObj = buildInputObject(col)
    const updateObj = buildInputObject(col, true)

    return `
describe('${col.pascalName}', () => {
  const api = new ${col.pascalName}Api(config)
  let createdId: string | undefined

  afterAll(async () => {
    if (createdId) {
      try { await api.delete${col.pascalName}({ id: createdId }) } catch {}
    }
  })

  it('should create a record', async () => {
    const result = await api.create${col.pascalName}({
      ${inputKey}: ${createObj}
    })
    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
    expect(result.data!.id).toBeDefined()
    createdId = String(result.data!.id)
  })

  it('should read a record', async () => {
    expect(createdId).toBeDefined()
    const result = await api.get${col.pascalName}({ id: createdId! })
    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
    expect(String(result.data!.id)).toBe(createdId)
  })

  it('should list records', async () => {
    const result = await api.list${col.pascalName}()
    expect(result.data).toBeDefined()
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('should update a record', async () => {
    expect(createdId).toBeDefined()
    const result = await api.update${col.pascalName}({
      id: createdId!,
      ${inputKey}: ${updateObj}
    })
    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
  })

  it('should delete a record', async () => {
    expect(createdId).toBeDefined()
    await api.delete${col.pascalName}({ id: createdId! })
    createdId = undefined
  })
})
`
  }).join('\n')

  return `import { describe, it, expect, afterAll } from 'vitest'
import { Configuration, ${imports} } from '../sdk/src/index'

const config = new Configuration({
  basePath: process.env.VDF_API_URL || '${apiBaseUrl}',
})

${testBlocks}
`
}

function generateReadme(projectName: string, collections: CollectionInfo[], apiBaseUrl: string): string {
  const collectionDocs = collections.map(col => {
    const methods = col.operations.map(op => `  - \`${op}()\``).join('\n')
    return `### ${col.pascalName}\n${methods}`
  }).join('\n\n')

  return `# ${projectName} SDK

Auto-generated TypeScript SDK for the ${projectName} Data Engine API.

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Configure (optional — defaults to ${apiBaseUrl})
cp .env.example .env
# Edit .env with your API URL

# 3. Run the hello world app
npm start
\`\`\`

## Available Methods

${collectionDocs}

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Watch mode
npm run test:watch
\`\`\`

## Examples

\`\`\`bash
npx tsx src/examples/create-and-list.ts
\`\`\`

## API Reference

Visit the Swagger UI at: ${apiBaseUrl.replace('/api', '')}/_swagger
`
}

export function getAvailableLanguages() {
  return [
    { language: 'typescript', generator: 'typescript-fetch', status: 'available' },
    { language: 'python', generator: 'python', status: 'coming-soon' },
    { language: 'go', generator: 'go', status: 'coming-soon' },
    { language: 'java', generator: 'java', status: 'coming-soon' },
    { language: 'csharp', generator: 'csharp-netcore', status: 'coming-soon' },
  ]
}
