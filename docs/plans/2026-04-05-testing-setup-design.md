# Comprehensive Testing Setup Design

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Full-stack testing + security hardening + CI/CD for VitrualSchoolCreator

## Overview

Add a 7-layer testing pyramid covering code hygiene through E2E, auto-fix 6 identified security issues, and establish a CI/CD pipeline.

## Layer 1: Code Hygiene

### Linting (ESLint)
- Extend existing flat config with `eslint-plugin-security` for vulnerability patterns
- Add `eslint-plugin-import` for import ordering and unused imports
- Add custom rule to flag hardcoded IDs and secrets

### Formatting (Prettier)
- Install Prettier with `prettier-plugin-tailwindcss` for class sorting
- Add `.prettierrc` with consistent config
- Add `format` npm script and `format:check` for CI

### Type Checking
- Add `typecheck` npm script: `tsc --noEmit`
- Gate CI on strict TypeScript

### Dead Code Detection
- Add `knip` to detect unused exports, files, dependencies
- Add `knip` npm script for CI

## Layer 2: Unit Tests (Vitest)

Expand beyond existing 3 tests:

| Target | File | Tests |
|--------|------|-------|
| Prisma singleton | `src/lib/prisma.ts` | Global caching, dev vs prod behavior |
| Utility functions | `src/lib/utils.ts` | `cn()` class merging edge cases |
| Supabase browser client | `src/lib/supabase/client.ts` | Client creation, config |
| Supabase server client | `src/lib/supabase/server.ts` | Cookie handling |
| Zod schemas | Parsers | Schema validation edge cases |
| CSV parser | `src/lib/parsers/csv.ts` | Existing + edge cases (empty, malformed) |
| Excel parser | `src/lib/parsers/excel.ts` | Existing + edge cases (missing sheets) |
| AI graph structure | `src/lib/ai/course-graph.ts` | Existing + state transitions |

## Layer 3: Component Tests (Testing Library + Vitest)

| Component | Tests |
|-----------|-------|
| `UploadCourse.tsx` | File selection, form submission, validation errors |
| `Button` | Variants, sizes, click handling |
| `Card` | Rendering, header/content/footer |
| `Input` | Value binding, onChange, disabled state |
| `Select` | Option rendering, selection |
| `Checkbox` | Checked/unchecked, onChange |
| `Label` | Association with inputs |

## Layer 4: API Route Tests

Mock Prisma, Supabase auth, and LLM calls:

| Route | Tests |
|-------|-------|
| `POST /api/ingest` | File upload, parsing, Inngest event dispatch, auth required, file size limit, validation |
| `GET /api/gap-analysis` | CourseId validation, auth required, LLM response handling, prompt injection guard |
| `GET/POST/PUT /api/inngest` | Webhook signature validation, step execution |

## Layer 5: Integration Tests

| Flow | Tests |
|------|-------|
| LangGraph pipeline | Full graph execution with mocked LLM responses |
| Inngest function | Step-by-step execution with mocked services |
| Auth middleware | Unauthenticated redirect, authenticated pass-through |
| Auth callback | OAuth code exchange, user creation, redirect |
| Dashboard access | Role-based page access (admin sees admin, student redirected from admin) |

## Layer 6: Security Fixes + Tests

### Fix 1: Rate Limiting
- Add `rate-limiter-flexible` to API routes
- Limit: 20 req/min per IP for ingest, 30 req/min for gap-analysis
- Test: Verify 429 response after limit exceeded

### Fix 2: Security Headers
- Configure `next.config.ts` with CSP, X-Frame-Options, X-Content-Type-Options, HSTS
- Test: Response header verification

### Fix 3: Dynamic schoolId
- Replace hardcoded `'temp_school_id'` with lookup from authenticated user's membership
- Test: Verify schoolId comes from user context

### Fix 4: File Upload Limits
- Add 10MB max file size, allowed extensions (.xlsx, .csv)
- Test: Reject oversized/invalid files

### Fix 5: Input Sanitization
- Sanitize `courseName`, `gradeLevel`, and other user inputs
- Test: XSS and injection attempts rejected

### Fix 6: Prompt Injection Guards
- Wrap user-provided data in LLM prompts with clear boundaries
- Add input length limits for LLM-bound strings
- Test: Prompt injection attempts are contained

## Layer 7: E2E Tests (Playwright)

| Scenario | Steps |
|----------|-------|
| Login flow | Visit / → redirect to /login → mock Google OAuth → land on dashboard |
| Admin dashboard | Upload file → verify processing started |
| Teacher dashboard | View courses → click course → see themes/weeks |
| Student dashboard | View enrolled courses → navigate to week details |
| Unauthorized access | Student visits /dashboard/admin → redirect |
| Course navigation | Dashboard → course → theme → week → back |

## CI/CD Pipeline (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint-and-format:
    - npm run lint
    - npm run format:check
    - npm run typecheck
    - npm run knip
  unit-and-component:
    - npm run test
    - npm run test:coverage (gate: 70%)
  integration:
    - npm run test:integration
  security:
    - npm audit
    - npm run test:security
  build:
    - npm run build
  e2e:
    - npm run test:e2e
```

## New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `prettier` | ^3 | Code formatting |
| `prettier-plugin-tailwindcss` | ^0.6 | Tailwind class sorting |
| `eslint-plugin-security` | ^3 | Security lint rules |
| `@vitest/coverage-v8` | ^4 | Coverage reports |
| `@playwright/test` | ^1.51 | E2E testing |
| `knip` | ^5 | Dead code detection |
| `rate-limiter-flexible` | ^5 | API rate limiting |
| `dompurify` | ^3 | Input sanitization |
| ` Helmet` | ^8 | HTTP security headers (via next.config) |

## npm Scripts

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit",
  "knip": "knip",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:security": "vitest run --config vitest.security.config.ts",
  "test:e2e": "playwright test",
  "test:all": "npm run lint && npm run format:check && npm run typecheck && npm run test && npm run test:integration && npm run test:security && npm run build && npm run test:e2e"
}
```

## Coverage Target

- **Minimum:** 70% line coverage
- **Goal:** 80% for lib/ and api/ directories
- Coverage collected on unit + component + API route tests
- Integration and E2E are not counted in coverage metrics
