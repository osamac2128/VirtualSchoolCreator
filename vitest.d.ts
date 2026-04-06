/// <reference types="vitest/globals" />

// Type declarations for custom DOM matchers added in vitest.setup.ts
// These extend Vitest's expect so tests can use jest-dom style assertions
// without requiring @testing-library/jest-dom.

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R
  toBeDisabled(): R
  toHaveClass(...classNames: string[]): R
  toHaveAttribute(attr: string, value?: string): R
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
