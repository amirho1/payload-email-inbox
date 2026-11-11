import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** Scope Tailwind theme/property initialization without adding a host-wide reset. */
export function scopeCss(css) {
  return css
    .replaceAll('--tw-', '--pm-')
    .replaceAll(':root,:host{', '.payload-mail{')
    .replaceAll(
      /\*,::?before,::?after,::backdrop\{/g,
      '.payload-mail,.payload-mail *,.payload-mail ::before,.payload-mail ::after,.payload-mail ::backdrop{',
    )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = new URL('../dist/styles.css', import.meta.url)
  const css = scopeCss(await readFile(path, 'utf8'))
  if (!css.includes('.pm\\:p-4')) throw new Error('Tailwind utilities missing')
  await writeFile(path, css)
}
