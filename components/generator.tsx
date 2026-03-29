"use client"

import { useState, useRef } from "react"
import type { Session } from "next-auth"
import { SkillPreview } from "./skill-preview"

interface Props {
  session: Session
}

type Step = "upload" | "generating" | "done"

export function Generator({ session }: Props) {
  const [step, setStep] = useState<Step>("upload")
  const [bookText, setBookText] = useState("")
  const [skillMd, setSkillMd] = useState("")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState("")
  const [remaining, setRemaining] = useState<number | null>(null)
  const [prUrl, setPrUrl] = useState("")
  const [prLoading, setPrLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function extractPdf(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const pages = await Promise.all(
      Array.from({ length: Math.min(pdf.numPages, 80) }, async (_, i) => {
        const page = await pdf.getPage(i + 1)
        const content = await page.getTextContent()
        return content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
      })
    )
    return pages.join("\n")
  }

  async function handleFile(file: File) {
    setError("")
    setFilename(file.name)
    try {
      const text = await extractPdf(file)
      setBookText(text)
    } catch {
      setError("Could not extract text from this PDF. Try a text-based PDF (not scanned images).")
    }
  }

  async function generate() {
    if (!bookText) return
    setStep("generating")
    setSkillMd("")
    setError("")

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookText }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError("Generation failed — please try again.")
      setStep("upload")
      return
    }

    const rem = res.headers.get("X-Remaining-Generations")
    if (rem) setRemaining(parseInt(rem))

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let full = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value, { stream: true })
      setSkillMd(full)
    }
    if (!full.trim()) {
      setError("Generation failed — the service may be temporarily unavailable. Please try again in a moment.")
      setStep("upload")
      return
    }
    setStep("done")
  }

  async function openPr() {
    setPrLoading(true)
    setError("")
    const res = await fetch("/api/pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillContent: skillMd }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "PR creation failed.")
    } else {
      setPrUrl(data.url)
    }
    setPrLoading(false)
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <a href="https://github.com/booklib-ai/skills" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors">
          ← booklib-ai/skills
        </a>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          {remaining !== null && (
            <span className="bg-[var(--card-bg)] border border-[var(--card-border)] px-2 py-1 rounded">
              {remaining} generation{remaining !== 1 ? "s" : ""} left today
            </span>
          )}
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="hover:text-[var(--text-dim)] transition-colors">
              Sign out ({session.user?.name})
            </button>
          </form>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1">Generate a skill</h1>
      <p className="text-[var(--text-dim)] text-sm mb-8">
        Upload a programming book PDF → get a{" "}
        <code className="mono text-xs">SKILL.md</code> → contribute it in one click.
      </p>

      {/* Step 1: Upload */}
      <section className="mb-6">
        <div
          className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file?.type === "application/pdf") handleFile(file)
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          {filename ? (
            <div>
              <p className="text-[var(--text-main)] font-medium">{filename}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {bookText ? `${Math.round(bookText.length / 1000)}k characters extracted` : "Extracting…"}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[var(--text-dim)] mb-1">Drop a PDF here or click to upload</p>
              <p className="text-xs text-[var(--text-muted)]">Text-based PDFs only · First 80 pages used · Never stored</p>
            </div>
          )}
        </div>

        {/* Paste fallback */}
        {!filename && (
          <details className="mt-3">
            <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-dim)]">
              Or paste book text instead
            </summary>
            <textarea
              className="w-full mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3 text-sm text-[var(--text-main)] mono resize-none focus:outline-none focus:border-[var(--primary)] transition-colors"
              rows={6}
              placeholder="Paste excerpts from the book…"
              value={bookText}
              onChange={(e) => setBookText(e.target.value)}
            />
          </details>
        )}
      </section>

      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Generate button */}
      {step !== "done" && (
        <button
          onClick={generate}
          disabled={!bookText || step === "generating"}
          className="w-full bg-[var(--primary)] text-white font-semibold text-sm py-3 rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-8"
        >
          {step === "generating" ? "Generating…" : "Generate SKILL.md"}
        </button>
      )}

      {/* Loading state before first chunk arrives */}
      {step === "generating" && !skillMd && (
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] py-4">
          <span className="inline-block w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          Generating your SKILL.md…
        </div>
      )}

      {/* Step 2: Preview (streams in) */}
      {(step === "generating" || step === "done") && skillMd && (
        <SkillPreview
          content={skillMd}
          streaming={step === "generating"}
          onReset={() => { setStep("upload"); setSkillMd(""); setPrUrl(""); setBookText(""); setFilename(""); }}
          onOpenPr={openPr}
          prUrl={prUrl}
          prLoading={prLoading}
        />
      )}
    </main>
  )
}
