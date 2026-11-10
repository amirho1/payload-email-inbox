import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { cpus, totalmem } from 'node:os'
for (const mode of ['baseline', 'enabled'])
  execFileSync(process.execPath, ['--expose-gc', 'scripts/measureWorker.mjs', mode], {
    stdio: 'inherit',
  })
const baseline = JSON.parse(await readFile('.private/measure-baseline.json', 'utf8'))
const enabled = JSON.parse(await readFile('.private/measure-enabled.json', 'utf8'))
const client = ['inbox', 'composer', 'message', 'button', 'api', 'translations'].map(
  (n) => `dist/ui/${n}.js`,
)
const js = Buffer.concat(await Promise.all(client.map((p) => readFile(p))))
const css = await readFile('dist/styles.css')
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const result = {
  hardware: {
    cpu: cpus()[0].model,
    cores: cpus().length,
    memoryBytes: totalmem(),
    platform: process.platform,
    arch: process.arch,
  },
  baseline,
  enabled,
  idleRssDeltaBytes: enabled.idleRssBytes - baseline.idleRssBytes,
  compiledClientGzipBytes: gzipSync(js).length,
  compiledCssBytes: css.length,
  directRuntimeDependencies: Object.keys(pkg.dependencies),
  limits: {
    tarballBytes: 153600,
    clientGzipBytes: 35840,
    cssBytes: 20480,
    idleRssDeltaBytes: 52428800,
    inboxP95ms: 250,
    burstAckMs: 5000,
  },
}
await writeFile('docs/measurements.json', JSON.stringify(result, null, 2) + '\n')
if (
  result.compiledClientGzipBytes > 35840 ||
  css.length > 20480 ||
  result.idleRssDeltaBytes > 52428800 ||
  enabled.inboxP95ms > 250 ||
  enabled.burstMaxAckMs > 5000 ||
  enabled.normalizedMessages !== 100
)
  throw new Error('Performance budget failed; inspect measurements')
console.log('Measurement budgets passed; docs/measurements.json')
