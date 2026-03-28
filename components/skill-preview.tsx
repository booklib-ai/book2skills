"use client"

interface Props {
  content: string
  streaming: boolean
  onReset: () => void
  onOpenPr: () => void
  prUrl: string
  prLoading: boolean
}

export function SkillPreview({ content, streaming, onReset, onOpenPr, prUrl, prLoading }: Props) {
  function copy() {
    navigator.clipboard.writeText(content)
  }

  function download() {
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "SKILL.md"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-dim)]">
          Generated SKILL.md {streaming && <span className="text-[var(--primary)] animate-pulse">●</span>}
        </h2>
        {!streaming && (
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] border border-[var(--card-border)] px-3 py-1.5 rounded-lg transition-colors"
            >
              Copy
            </button>
            <button
              onClick={download}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] border border-[var(--card-border)] px-3 py-1.5 rounded-lg transition-colors"
            >
              Download
            </button>
          </div>
        )}
      </div>

      <pre className="mono text-xs text-[var(--text-dim)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 overflow-auto max-h-[500px] whitespace-pre-wrap leading-relaxed">
        {content}
      </pre>

      {!streaming && (
        <div className="mt-5 flex flex-col gap-3">
          {prUrl ? (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-green-600 hover:bg-green-500 text-white font-semibold text-sm py-3 rounded-lg transition-colors"
            >
              ✓ PR opened — view on GitHub →
            </a>
          ) : (
            <button
              onClick={onOpenPr}
              disabled={prLoading}
              className="w-full bg-[var(--primary)] hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
            >
              {prLoading ? "Opening PR…" : "Open PR on booklib-ai/skills →"}
            </button>
          )}

          <p className="text-xs text-[var(--text-muted)] text-center">
            This forks the repo under your GitHub account and opens a real PR.
            You can edit the skill further before it&apos;s merged.
          </p>

          <button
            onClick={onReset}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors text-center"
          >
            ← Generate another
          </button>
        </div>
      )}
    </section>
  )
}
