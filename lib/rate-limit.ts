import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let ratelimit: Ratelimit | null = null

function getRatelimit() {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
        token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
      }),
      limiter: Ratelimit.slidingWindow(3, "1 d"),
      prefix: "book2skills:generate",
    })
  }
  return ratelimit
}

export async function checkRateLimit(identifier: string) {
  const { success, remaining, reset } = await getRatelimit().limit(identifier)
  return { success, remaining, reset }
}
