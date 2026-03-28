import { Octokit } from "@octokit/rest"
import { auth } from "@/lib/auth"

export const maxDuration = 30

const UPSTREAM_OWNER = "booklib-ai"
const UPSTREAM_REPO = "skills"

function extractFrontmatter(skillMd: string): { name: string; title: string } {
  const nameMatch = skillMd.match(/^name:\s*(.+)$/m)
  const h1Match = skillMd.match(/^#\s+(.+)$/m)
  const name = nameMatch?.[1]?.trim() ?? "new-skill"
  const title = h1Match?.[1]?.trim() ?? name
  return { name, title }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.githubAccessToken || !session?.githubUsername) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { skillContent } = await req.json()
  if (!skillContent || typeof skillContent !== "string") {
    return new Response("Missing skillContent", { status: 400 })
  }

  const octokit = new Octokit({ auth: session.githubAccessToken })
  const username = session.githubUsername
  const { name: slug, title } = extractFrontmatter(skillContent)
  const branch = `add-skill-${slug}`

  try {
    // 1. Fork (no-op if fork already exists)
    await octokit.repos.createFork({ owner: UPSTREAM_OWNER, repo: UPSTREAM_REPO })

    // Poll until fork is ready (GitHub provisioning takes 1–5s)
    let forkReady = false
    for (let i = 0; i < 10; i++) {
      try {
        await octokit.repos.get({ owner: username, repo: UPSTREAM_REPO })
        forkReady = true
        break
      } catch {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    if (!forkReady) throw new Error("Fork not ready after 10s — try again")

    // 2. Get HEAD SHA of upstream main
    const { data: upstreamRef } = await octokit.git.getRef({
      owner: UPSTREAM_OWNER,
      repo: UPSTREAM_REPO,
      ref: "heads/main",
    })
    const sha = upstreamRef.object.sha

    // 3. Sync fork's main to upstream (force-update ref)
    await octokit.git.updateRef({
      owner: username,
      repo: UPSTREAM_REPO,
      ref: "heads/main",
      sha,
      force: true,
    })

    // 4. Create branch on fork
    await octokit.git.createRef({
      owner: username,
      repo: UPSTREAM_REPO,
      ref: `refs/heads/${branch}`,
      sha,
    })

    // 5. Create SKILL.md in the new branch
    await octokit.repos.createOrUpdateFileContents({
      owner: username,
      repo: UPSTREAM_REPO,
      path: `skills/${slug}/SKILL.md`,
      message: `feat: add ${title} skill`,
      content: Buffer.from(skillContent).toString("base64"),
      branch,
    })

    // 6. Open PR against upstream
    const { data: pr } = await octokit.pulls.create({
      owner: UPSTREAM_OWNER,
      repo: UPSTREAM_REPO,
      title: `feat: add ${title} skill`,
      head: `${username}:${branch}`,
      base: "main",
      body: `## New Skill: ${title}

Generated from a book PDF using [book2skills](https://github.com/booklib-ai/book2skills).

### Before merging
- [ ] Reviewed generated content for accuracy
- [ ] Added \`examples/before.md\` and \`examples/after.md\`
- [ ] Confirmed eval pass rate ≥ 80%

/cc @booklib-ai`,
    })

    return Response.json({ url: pr.html_url, number: pr.number })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
