import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    
    // Test connection
    const pingResult = await redis.ping();
    console.log('Ping result:', pingResult);
    
    // List sites
    const keys = await redis.keys('site:*:client');
    console.log('Available site keys:', keys);
    
    // Show details for each site
    for (const key of keys) {
      const siteId = key.split(':')[1];
      const data = await redis.get(key);
      console.log(`\nSite ID: ${siteId}`);
      console.log(`Title: ${data?.siteTitle || 'No title'}`);
    }
    
    console.log('\nRedis test complete!');
  } catch (error) {
    console.error('Redis test failed:', error);
  }
}

testRedis();