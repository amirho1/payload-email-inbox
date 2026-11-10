import { readFile, writeFile } from 'node:fs/promises'
const path = new URL('../dist/styles.css', import.meta.url)
let css = await readFile(path, 'utf8')
css = css
  .replaceAll(':root,:host{', '.payload-mail{')
  .replaceAll(
    '*,::before,::after,::backdrop{',
    '.payload-mail,.payload-mail *,.payload-mail ::before,.payload-mail ::after,.payload-mail ::backdrop{',
  )
if (!css.includes('.pm\\:p-4')) throw new Error('Tailwind utilities missing')
await writeFile(path, css)
