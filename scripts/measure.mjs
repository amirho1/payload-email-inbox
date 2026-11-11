import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { cpus, totalmem } from 'node:os'
import { build } from 'esbuild'
for (const mode of ['baseline', 'enabled'])
  execFileSync(process.execPath, ['--expose-gc', 'scripts/measureWorker.mjs', mode], {
    stdio: 'inherit',
  })
const baseline = JSON.parse(await readFile('.private/measure-baseline.json', 'utf8'))
const enabled = JSON.parse(await readFile('.private/measure-enabled.json', 'utf8'))
const bundled = await build({
  entryPoints: ['dist/ui/inbox.js', 'dist/ui/nav.js'],
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  write: false,
  outdir: '.private/measured-client',
  external: [
    'react',
    'react/*',
    'react-dom',
    'react-dom/*',
    '@payloadcms/*',
    'payload',
    'next',
    'next/*',
  ],
})
const clientBytes = bundled.outputFiles.reduce(
  (total, file) => total + gzipSync(file.contents).length,
  0,
)
const css = await readFile('dist/styles.css')
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const tarball = JSON.parse(await readFile('.private/consumer-evidence.json', 'utf8'))
if (tarball.version !== pkg.version) throw new Error('Run pnpm test:consumer before measurements')
const result = {
  hardware: {
    cpu: cpus()[0].model,
    cores: cpus().length,
    memoryBytes: totalmem(),
    platform: process.platform,
    arch: process.arch,
  },
  tarballBytes: tarball.packedBytes,
  packageVersion: tarball.version,
  clientMeasurement:
    'esbuild browser ESM bundle of inbox and nav, splitting/minification; sum of per-file gzip; excludes React/Payload/Next host peers',
  baseline,
  enabled,
  idleRssDeltaBytes: enabled.idleRssBytes - baseline.idleRssBytes,
  compiledClientGzipBytes: clientBytes,
  compiledCssBytes: css.length,
  directRuntimeDependencies: Object.keys(pkg.dependencies),
  limits: {
    tarballBytes: 230400,
    clientGzipBytes: 112640,
    cssBytes: 25600,
    idleRssDeltaBytes: 52428800,
    inboxP95ms: 250,
    burstAckMs: 5000,
  },
}
await writeFile('docs/measurements.json', JSON.stringify(result, null, 2) + '\n')
if (
  result.tarballBytes > 230400 ||
  result.compiledClientGzipBytes > 112640 ||
  css.length > 25600 ||
  result.idleRssDeltaBytes > 52428800 ||
  enabled.sqlStatementsPerInbox > 5 ||
  enabled.inboxP95ms > 250 ||
  enabled.burstMaxAckMs > 5000 ||
  enabled.normalizedMessages !== 100
)
  throw new Error('Performance budget failed; inspect measurements')
console.log('Measurement budgets passed; docs/measurements.json')
