import { rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
const fixture = process.env.MAIL_FIXTURE_DIR
if (!fixture || fixture !== join(process.cwd(), '.private', 'fixture'))
  throw new Error('Expected isolated synthetic fixture path')
for (const name of await readdir(fixture))
  if (name === 'captured' || name.startsWith('example.db'))
    await rm(join(fixture, name), { recursive: true, force: true })
const child = spawn('pnpm', ['--dir', '.private/consumer', 'dev'], {
  stdio: 'inherit',
  env: process.env,
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 1))
