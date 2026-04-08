'use client'

import { useState } from 'react'
import { BarChart2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface GapResult {
  missingStandards: string[]
  suggestion: string
}

export function GapAnalysisButton({ courseId }: { courseId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GapResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  async function runAnalysis() {
    if (result) {
      setIsExpanded(!isExpanded)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gap-analysis?courseId=${encodeURIComponent(courseId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
      setIsExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={runAnalysis}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="h-3.5 w-3.5" />}
        {isLoading ? 'Analysing...' : result ? (isExpanded ? 'Hide Analysis' : 'Show Analysis') : 'Gap Analysis'}
        {result && !isLoading && (isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {result && isExpanded && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-3">
          <div>
            <p className="font-medium text-foreground mb-1.5">Missing Standards ({result.missingStandards.length})</p>
            {result.missingStandards.length === 0 ? (
              <p className="text-muted-foreground text-xs">All standards covered.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {result.missingStandards.slice(0, 20).map((code) => (
                  <span key={code} className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                    {code}
                  </span>
                ))}
                {result.missingStandards.length > 20 && (
                  <span className="text-xs text-muted-foreground">+{result.missingStandards.length - 20} more</span>
                )}
              </div>
            )}
          </div>
          {result.suggestion && (
            <div>
              <p className="font-medium text-foreground mb-1">AI Recommendation</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{result.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
