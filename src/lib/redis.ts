import { Redis } from "@upstash/redis";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

if (!redisUrl || !redisToken) {
  // Warn at startup rather than throwing, so the build can complete.
  // Any actual Redis call will fail with a network error until the vars are set.
  console.warn(
    "[redis] Missing Redis REST credentials. Expected UPSTASH_REDIS_REST_URL/TOKEN " +
      "or KV_REST_API_URL/TOKEN. API routes that use Redis will return 500 until set."
  );
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});
