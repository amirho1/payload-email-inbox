import { readFile, realpath, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const root = JSON.parse(await readFile('package.json', 'utf8'))
const packages = new Map()
const peers = new Set(Object.keys(root.peerDependencies))
async function visit(name, from) {
  if (peers.has(name)) return
  const require = createRequire(join(from, 'package.json'))
  let directory
  try {
    directory = dirname(require.resolve(`${name}/package.json`))
  } catch {
    directory = dirname(require.resolve(name))
    while (true) {
      try {
        const candidate = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
        if (candidate.name === name) break
      } catch {
        /* An entry can live several directories below its manifest. */
      }
      const parent = dirname(directory)
      if (parent === directory) throw new Error(`Cannot resolve license manifest for ${name}`)
      directory = parent
    }
  }
  directory = await realpath(directory)
  const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  const key = `${pkg.name}@${pkg.version}`
  if (packages.has(key)) return
  if (!pkg.license || !/MIT|ISC|BSD|Apache|0BSD/.test(pkg.license))
    throw new Error(`Review license for ${key}`)
  packages.set(key, { name: pkg.name, version: pkg.version, license: pkg.license })
  for (const dependency of Object.keys(pkg.dependencies || {})) await visit(dependency, directory)
}
for (const name of Object.keys(root.dependencies)) await visit(name, process.cwd())
const result = {
  productionPackageCount: packages.size,
  directRuntimeDependencies: Object.keys(root.dependencies).length,
  excludes: [...peers],
  licenses: [...new Set([...packages.values()].map((pkg) => pkg.license))].sort(),
  packages: [...packages.values()].sort((a, b) =>
    `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
  ),
}
if (result.productionPackageCount > 160 || result.directRuntimeDependencies > 20)
  throw new Error('Dependency budget exceeded')
await writeFile('docs/dependencies.json', JSON.stringify(result, null, 2) + '\n')
console.log(
  `${result.productionPackageCount} non-peer production packages; ${result.directRuntimeDependencies} direct runtime dependencies; permissive license inventory passed.`,
)
