/**
 * Input sanitization utilities.
 *
 * Strip control characters, trim whitespace, and enforce a maximum length.
 * These functions are intentionally conservative — they are not full HTML
 * sanitizers (we have no HTML rendering of user input). Their purpose is to
 * prevent prompt injection via LLM calls and XSS via reflected values.
 */

/** Characters that are meaningful in LLM prompt injection attacks */
const PROMPT_INJECTION_PATTERN =
  /(\bignore\b|\bforget\b|\bsystem\b|\bprompt\b|<\|.+?\|>|```)/gi

/**
 * Sanitize a plain-text string that will be stored in the DB or displayed
 * in the UI.  Strips control characters, limits length.
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return (
    input
      // Remove ASCII control characters (0x00–0x1F except tab/newline) and DEL
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()
      .slice(0, maxLength)
  )
}

/**
 * Sanitize a string that will be interpolated into an LLM prompt.
 * In addition to plain-text sanitization, wraps the value in a safe delimiter
 * and strips common prompt-injection patterns.
 */
export function sanitizeForPrompt(input: string, maxLength = 200): string {
  const cleaned = sanitizeText(input, maxLength).replace(PROMPT_INJECTION_PATTERN, '[removed]')
  // Wrap in delimiters so the model treats it as data, not instructions
  return `<<<${cleaned}>>>`
}

/** Validate that a string contains only digits (for gradeLevel) */
export function isNumericString(value: string): boolean {
  return /^\d+$/.test(value.trim())
}

/** Validate that a track value is one of the allowed enum values */
export function isValidTrack(value: string): boolean {
  return ['STANDARD', 'PREAP', 'AP'].includes(value)
}
