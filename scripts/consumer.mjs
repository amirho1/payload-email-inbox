import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises'
import { generateKeyPairSync } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const consumer = join(root, '.private', 'consumer')
await rm(consumer, { recursive: true, force: true })
execFileSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' })
const [packed] = JSON.parse(
  execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: root, encoding: 'utf8' }),
)
await mkdir(consumer, { recursive: true, mode: 0o700 })
await cp(join(root, 'example'), consumer, {
  recursive: true,
  filter: (path) => !path.includes('node_modules') && !path.includes('.next'),
})
const pkg = JSON.parse(await readFile(join(consumer, 'package.json'), 'utf8'))
pkg.dependencies['payload-plugin-mail'] = `file:${join(root, packed.filename)}`
await writeFile(join(consumer, 'package.json'), JSON.stringify(pkg, null, 2))
const fixture = join(root, '.private', 'fixture')
await rm(fixture, { recursive: true, force: true })
await mkdir(fixture, { recursive: true, mode: 0o700 })
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
await writeFile(
  join(fixture, 'private.pem'),
  keys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
  { mode: 0o600 },
)
await writeFile(
  join(fixture, 'public.pem'),
  keys.publicKey.export({ type: 'spki', format: 'pem' }),
  { mode: 0o600 },
)
const env = {
  ...process.env,
  MAIL_FIXTURE_DIR: fixture,
  PAYLOAD_CONFIG_PATH: join(consumer, 'payload.config.ts'),
}
execFileSync('pnpm', ['install', '--ignore-workspace', '--reporter=append-only'], {
  cwd: consumer,
  env,
  stdio: 'inherit',
})
execFileSync(
  'node',
  ['--import', 'tsx', 'node_modules/payload/bin.js', 'generate:importmap', '--disable-transpile'],
  { cwd: consumer, env, stdio: 'inherit' },
)
execFileSync(
  'node',
  [
    '--import',
    'tsx',
    '--input-type=module',
    '-e',
    "import {getPayload} from 'payload'; import config from './payload.config.ts'; import {payloadMail} from 'payload-plugin-mail'; const p=await getPayload({config}); const c=await p.count({collection:'mail-messages',overrideAccess:true}); if(typeof payloadMail!=='function'||c.totalDocs!==0)throw new Error('Consumer smoke failed'); await p.destroy(); console.log('Clean packed consumer: imports, Payload SQLite initialization, schema, and auth seed passed.')",
  ],
  { cwd: consumer, env, stdio: 'inherit' },
)
await writeFile(
  join(root, '.private', 'consumer-evidence.json'),
  JSON.stringify(
    {
      package: packed.name,
      version: packed.version,
      tarball: packed.filename,
      packedBytes: packed.size,
      unpackedBytes: packed.unpackedSize,
      files: packed.files.length,
      consumer,
      fixture,
    },
    null,
    2,
  ),
)
console.log(`Packed consumer ready: ${consumer}`)
