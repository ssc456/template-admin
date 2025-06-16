import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' }); // Changed file path

// Log the environment variables to debug
console.log('URL:', process.env.KV_REST_API_URL ? 'Found' : 'Not found');
console.log('Token:', process.env.KV_REST_API_TOKEN ? 'Found' : 'Not found');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,        // Changed from UPSTASH_REDIS_REST_URL
  token: process.env.KV_REST_API_TOKEN,    // Changed from UPSTASH_REDIS_REST_TOKEN
});

async function testConnection() {
  try {
    console.log('Testing Redis connection...');
    await redis.set('test-key', 'It works!');
    const value = await redis.get('test-key');
    console.log('Redis connection successful:', value);
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
}

testConnection();