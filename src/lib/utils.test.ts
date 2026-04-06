import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn() — class merging utility', () => {
  it('merges simple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles undefined and null gracefully', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('deduplicates Tailwind conflicting utilities — last wins', () => {
    // tailwind-merge: p-4 overrides p-2
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles conditional objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('handles arrays of classes', () => {
    expect(cn(['flex', 'items-center'], 'gap-2')).toBe('flex items-center gap-2')
  })

  it('returns empty string when no classes provided', () => {
    expect(cn()).toBe('')
  })

  it('trims redundant whitespace', () => {
    // clsx + twMerge should produce clean output
    const result = cn('  flex  ', 'items-center')
    expect(result.trim()).toBe('flex items-center')
  })

  it('merges responsive Tailwind variants correctly', () => {
    // md:p-4 should not conflict with p-2 (different breakpoint)
    const result = cn('p-2', 'md:p-4')
    expect(result).toContain('p-2')
    expect(result).toContain('md:p-4')
  })
})
