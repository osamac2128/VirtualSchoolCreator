import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We mock the PrismaClient constructor so the singleton test doesn't need a
// real database connection.
vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn(() => ({ _isMockPrisma: true }))
  return { PrismaClient }
})

describe('Prisma singleton', () => {
  beforeEach(() => {
    vi.resetModules()
    // Clear cached instance so each test gets a fresh module evaluation
    // @ts-expect-error: globalThis.prisma is declared as any
    delete globalThis.prisma
  })

  afterEach(() => {
    // @ts-expect-error: cleanup
    delete globalThis.prisma
  })

  it('returns a PrismaClient instance', async () => {
    const { default: prisma } = await import('./prisma')
    expect(prisma).toBeDefined()
    expect((prisma as unknown as { _isMockPrisma: boolean })._isMockPrisma).toBe(true)
  })

  it('caches the instance on globalThis in non-production environments', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { default: prisma } = await import('./prisma')
    expect(globalThis.prisma).toBeDefined()
    expect(globalThis.prisma).toBe(prisma)
    vi.unstubAllEnvs()
  })

  it('does NOT cache the instance on globalThis in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await import('./prisma')
    expect(globalThis.prisma).toBeUndefined()
    vi.unstubAllEnvs()
  })
})
