import { streamText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { auth } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { SKILL_GENERATION_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/skill-prompt"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.githubUsername) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { success, remaining } = await checkRateLimit(session.githubUsername)
  if (!success) {
    return new Response(
      JSON.stringify({ error: "Rate limit reached. 3 generations per day." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    )
  }

  const { bookText } = await req.json()
  if (!bookText || typeof bookText !== "string" || bookText.trim().length < 500) {
    return new Response(
      JSON.stringify({ error: "Book text too short — need at least 500 characters." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const result = streamText({
      model: anthropic("claude-3-5-haiku-20241022"),
      system: SKILL_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(bookText) }],
    })

    return result.toTextStreamResponse({
      headers: { "X-Remaining-Generations": String(remaining) },
    })
  } catch (err) {
    console.error("[generate] streamText error:", err)
    return new Response(
      JSON.stringify({ error: "Generation failed — please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
