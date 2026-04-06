import { expect } from 'vitest'

// Lightweight jest-dom shim so tests can use common DOM matchers
// without requiring the @testing-library/jest-dom package.

expect.extend({
  toBeInTheDocument(received: Element | null) {
    const pass = received !== null && document.body.contains(received)
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`,
    }
  },
  toBeDisabled(received: HTMLElement | null) {
    const pass =
      received !== null &&
      (received.hasAttribute('disabled') || (received as HTMLInputElement).disabled === true)
    return {
      pass,
      message: () => (pass ? `expected element not to be disabled` : `expected element to be disabled`),
    }
  },
  toHaveClass(received: HTMLElement | null, ...classNames: string[]) {
    const pass =
      received !== null && classNames.every((cls) => received.classList.contains(cls))
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have classes ${classNames.join(', ')}`
          : `expected element to have classes ${classNames.join(', ')}`,
    }
  },
  toHaveAttribute(received: HTMLElement | null, attr: string, value?: string) {
    if (!received) {
      return { pass: false, message: () => 'element is null' }
    }
    const hasAttr = received.hasAttribute(attr)
    const pass = value === undefined ? hasAttr : received.getAttribute(attr) === value
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have attribute ${attr}${value !== undefined ? `="${value}"` : ''}`
          : `expected element to have attribute ${attr}${value !== undefined ? `="${value}"` : ''}`,
    }
  },
})
