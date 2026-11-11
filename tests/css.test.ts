import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'

it('isolates minified Tailwind property initializers and variables from the host', () => {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import { scopeCss } from './scripts/scopeCss.mjs';
    const inputs = ['*,::before,::after,::backdrop{--tw-shadow:0}', '*,:before,:after,::backdrop{--tw-shadow:0}', ':root,:host{--pm-color-red:red}@property --tw-shadow{syntax:"*";inherits:false}'];
    console.log(JSON.stringify(inputs.map(scopeCss)));
  `,
      ],
      { encoding: 'utf8' },
    ),
  ) as string[]
  for (const css of result) {
    expect(css).toContain('.payload-mail')
    expect(css).not.toContain('--tw-')
    expect(css).not.toMatch(/(?:^|})\*,/)
    expect(css).not.toContain(':root,:host')
  }
  expect(result[2]).toContain('@property --pm-shadow')
})
