import { spawn, execFileSync } from 'node:child_process'
import { watch } from 'node:fs'
import { cp, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateKeyPairSync } from 'node:crypto'
import { createServer } from 'node:net'
import { scopeCss } from './scopeCss.mjs'
import { seedDevelopment } from './devSeed.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const app = join(root, '.private', 'dev')
const data = join(root, '.private', 'dev-data')
const live = join(app, 'plugin-live')
const port = Number(process.env.MAIL_DEV_PORT || 4101)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('MAIL_DEV_PORT must be 1024–65535')
const baseURL = `http://127.0.0.1:${port}`
await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', () =>
    reject(new Error(`Port ${port} is in use. Use the existing preview or choose MAIL_DEV_PORT.`)),
  )
  probe.listen(port, '127.0.0.1', () => probe.close(resolve))
})
await mkdir(app, { recursive: true, mode: 0o700 })
await mkdir(data, { recursive: true, mode: 0o700 })
await cp(join(root, 'example'), app, {
  recursive: true,
  filter: (path) => !/node_modules|\.next|\.env/.test(path),
})
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
execFileSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' })
const [packed] = JSON.parse(
  execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: root, encoding: 'utf8' }),
)
const example = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'))
example.dependencies['payload-plugin-mail'] = `file:${join(root, packed.filename)}`
await writeFile(join(app, 'package.json'), JSON.stringify(example, null, 2))
execFileSync('pnpm', ['install', '--ignore-workspace', '--reporter=append-only'], {
  cwd: app,
  stdio: 'inherit',
})
// Live output resides inside the app (outside node_modules), sharing the consumer's React/Payload instance.
await mkdir(live, { recursive: true })
await writeFile(join(live, 'package.json'), JSON.stringify({ name: pkg.name, type: 'module' }))
await cp(join(root, 'dist'), join(live, 'dist'), { recursive: true })
const aliases = Object.fromEntries(
  Object.entries(pkg.exports).map(([name, entry]) => [
    `${name === '.' ? pkg.name : `${pkg.name}/${name.slice(2)}`}$`,
    join(live, typeof entry === 'string' ? entry : entry.default),
  ]),
)
await writeFile(
  join(app, 'next.config.mjs'),
  `import { withPayload } from '@payloadcms/next/withPayload'\nexport default withPayload({reactStrictMode:true,transpilePackages:['payload-plugin-mail'],webpack(config){config.resolve.alias={...config.resolve.alias,...${JSON.stringify(aliases)}};return config}})\n`,
)
const configPath = join(app, 'payload.config.ts')
await writeFile(
  configPath,
  (await readFile(configPath, 'utf8'))
    .replaceAll('http://localhost:4100', `http://localhost:${port}`)
    .replaceAll('http://127.0.0.1:4100', baseURL)
    .replace(
      'export default buildConfig({',
      "export default buildConfig({\n  cookiePrefix: 'payload-mail-dev',",
    ),
)
try {
  await readFile(join(data, 'private.pem'))
} catch {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
  await writeFile(
    join(data, 'private.pem'),
    keys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    { mode: 0o600 },
  )
  await writeFile(
    join(data, 'public.pem'),
    keys.publicKey.export({ type: 'spki', format: 'pem' }),
    { mode: 0o600 },
  )
}
const env = { ...process.env, MAIL_FIXTURE_DIR: data, PAYLOAD_CONFIG_PATH: configPath }
execFileSync(
  'node',
  [
    '--import',
    'tsx',
    join(app, 'node_modules/payload/bin.js'),
    'generate:importmap',
    '--disable-transpile',
  ],
  { cwd: app, env, stdio: 'inherit' },
)
const children = []
const watchers = []
let mirroring = false,
  mirrorAgain = false
let stopping = false,
  styleTimer,
  mirrorTimer,
  heartbeat
function stop() {
  if (stopping) return
  stopping = true
  clearInterval(heartbeat)
  clearTimeout(styleTimer)
  clearTimeout(mirrorTimer)
  for (const watcher of watchers) watcher.close()
  for (const child of children) {
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch {}
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop)
function start(command, args, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  children.push(child)
  child.once('error', () => {
    process.exitCode = 1
    stop()
  })
  child.once('exit', (code) => {
    if (!stopping) {
      process.exitCode = code || 1
      stop()
    }
  })
  return child
}
async function mirror() {
  if (stopping) return
  if (mirroring) {
    mirrorAgain = true
    return
  }
  mirroring = true
  async function copy(directory, destination) {
    await mkdir(destination, { recursive: true })
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.endsWith('.tmp')) continue
      const source = join(directory, entry.name),
        target = join(destination, entry.name)
      if (entry.isDirectory()) await copy(source, target)
      else {
        const bytes = await readFile(source)
        let old
        try {
          old = await readFile(target)
        } catch {}
        if (!old?.equals(bytes)) {
          await writeFile(`${target}.tmp`, bytes)
          await rename(`${target}.tmp`, target)
        }
      }
    }
  }
  try {
    do {
      mirrorAgain = false
      await copy(join(root, 'dist'), join(live, 'dist'))
    } while (mirrorAgain && !stopping)
  } finally {
    mirroring = false
  }
}
watchers.push(
  watch(join(root, 'dist'), { recursive: true }, () => {
    clearTimeout(mirrorTimer)
    mirrorTimer = setTimeout(
      () =>
        void mirror().catch(() => console.error('Development mirror will retry on the next save.')),
      120,
    )
  }),
)
const cssPath = join(root, '.private', 'dev-style.css')
watchers.push(
  watch(join(root, '.private'), (_event, filename) => {
    if (String(filename) !== 'dev-style.css') return
    clearTimeout(styleTimer)
    styleTimer = setTimeout(async () => {
      try {
        const css = scopeCss(await readFile(cssPath, 'utf8'))
        await writeFile(join(root, 'dist', 'styles.css'), css)
      } catch {
        console.error('CSS watcher will retry on the next save.')
      }
    }, 80)
  }),
)
start('pnpm', ['exec', 'tsc', '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'])
start('pnpm', ['exec', 'tailwindcss', '-i', 'src/styles.css', '-o', cssPath, '--watch=always'])
start(
  'node',
  [
    join(app, 'node_modules/next/dist/bin/next'),
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  app,
)
await writeFile(
  join(root, '.private', 'dev-server.json'),
  JSON.stringify({ pid: process.pid, port, url: `${baseURL}/admin/mail`, dataDirectory: data }),
)
console.log(
  `\nLocal mail preview: ${baseURL}/admin/mail\nSynthetic login: agent@example.com / Synthetic-password-123!\nTypeScript + Tailwind watch enabled. Ctrl+C stops all preview processes.\n`,
)
for (let attempt = 0; attempt < 180 && !stopping; attempt++) {
  try {
    const response = await fetch(`${baseURL}/admin/login`, { signal: AbortSignal.timeout(3000) })
    if (response.ok) {
      const tick = await seedDevelopment(baseURL, data)
      heartbeat = setInterval(
        () =>
          void tick().catch(() =>
            console.error('Local provider tick unavailable; synthetic work remains durable.'),
          ),
        5000,
      )
      console.log('Signed synthetic inbox and durable draft are ready.')
      break
    }
  } catch {
    /* Next may still be compiling its first route. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
