import tseslint from 'typescript-eslint'
export default tseslint.config(...tseslint.configs.recommended, {
  ignores: ['dist/**', 'example/**', 'graphify-out/**', 'playwright-report/**', 'test-results/**'],
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
})
