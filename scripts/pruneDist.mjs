import { access, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

// TypeScript does not remove outputs for deleted source files; never ship stale modules.
async function prune(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = join(directory, entry.name)
    const source = join(relative, entry.name)
    if (entry.isDirectory()) await prune(child, source)
    else if (/\.(js|d\.ts)$/.test(source)) {
      const base = join('src', source.replace(/\.(js|d\.ts)$/, ''))
      const exists = await Promise.all(
        ['.ts', '.tsx'].map((extension) =>
          access(`${base}${extension}`).then(
            () => true,
            () => false,
          ),
        ),
      )
      if (!exists.some(Boolean)) await unlink(child)
    }
  }
}
await prune('dist')
