import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,        // Changed from UPSTASH_REDIS_REST_URL
  token: process.env.KV_REST_API_TOKEN,    // Changed from UPSTASH_REDIS_REST_TOKEN
});

export default redis;