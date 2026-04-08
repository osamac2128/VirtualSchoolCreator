/**
 * Lightweight structured logger for API route handlers.
 *
 * Usage:
 *   const log = apiLogger('POST /api/lessons', { lessonId })
 *   log.info('Lesson created', { id: lesson.id })
 *   log.warn('Not found', { lessonId })
 *   log.error('DB error', error)
 */

type Meta = Record<string, unknown>

function serialize(meta: Meta): string {
  try {
    return JSON.stringify(meta)
  } catch {
    return String(meta)
  }
}

export function apiLogger(route: string, baseMeta: Meta = {}) {
  const prefix = `[${route}]`

  return {
    info(message: string, extra: Meta = {}) {
      console.log(`${prefix} INFO  ${message}`, serialize({ ...baseMeta, ...extra }))
    },

    warn(message: string, extra: Meta = {}) {
      console.warn(`${prefix} WARN  ${message}`, serialize({ ...baseMeta, ...extra }))
    },

    error(message: string, err?: unknown, extra: Meta = {}) {
      const errMeta =
        err instanceof Error
          ? { errorMessage: err.message, stack: err.stack }
          : { errorRaw: String(err) }
      console.error(
        `${prefix} ERROR ${message}`,
        serialize({ ...baseMeta, ...extra, ...errMeta }),
      )
    },
  }
}
