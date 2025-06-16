import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import * as readline from 'readline';
import dotenv from 'dotenv';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.development.local' });

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function setupSite() {
  console.log('===== BizBud Site Setup Utility =====');
  
  // Get site ID (subdomain)
  const siteId = await new Promise(resolve => {
    rl.question('Enter site ID (will be used as subdomain): ', answer => {
      resolve(answer.trim().toLowerCase());
    });
  });
  
  if (!siteId) {
    console.error('Site ID is required');
    rl.close();
    return;
  }
  
  // Check if site already exists
  const existingData = await redis.get(`site:${siteId}:client`);
  if (existingData) {
    console.error(`Site with ID "${siteId}" already exists.`);
    rl.close();
    return;
  }
  
  // Get admin password
  const password = await new Promise(resolve => {
    rl.question('Enter admin password (min 6 characters): ', answer => {
      resolve(answer.trim());
    });
  });
  
  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters long');
    rl.close();
    return;
  }
  
  try {
    // Create password hash
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Try to load default client.json
    let clientData;
    try {
      // Try to load the client.json from public folder
      const clientJsonPath = path.join(__dirname, 'public', 'client.json');
      clientData = JSON.parse(fs.readFileSync(clientJsonPath, 'utf8'));
      
      // Update site title
      const siteTitle = await new Promise(resolve => {
        rl.question(`Enter site title [default: ${clientData.siteTitle}]: `, answer => {
          resolve(answer.trim() || clientData.siteTitle);
        });
      });
      
      clientData.siteTitle = siteTitle;
    } catch (error) {
      console.warn('Warning: Could not load default client.json, using minimal default');
      clientData = { 
        siteTitle: siteId,
        config: {
          primaryColor: "blue",
          showHero: true,
          showAbout: true,
          showServices: true,
          showFeatures: true,
          showTestimonials: true,
          showContact: true,
          showFAQ: true
        }
      };
    }
    
    // Store in Redis
    await redis.set(`site:${siteId}:settings`, {
      adminPasswordHash: passwordHash,
      createdAt: new Date().toISOString()
    });
    
    await redis.set(`site:${siteId}:client`, clientData);
    
    console.log(`\nSite "${siteId}" created successfully in Redis!`);
    console.log(`\nRemember to deploy your site with:`);
    console.log(`1. Clone template: gh repo create ${siteId} --public --template bizbud-template-site --clone`);
    console.log(`2. Deploy to Vercel: cd ${siteId} && vercel`);
    console.log(`3. Add these environment variables to your Vercel project:`);
    console.log(`   - KV_REST_API_URL=${process.env.KV_REST_API_URL}`);
    console.log(`   - KV_REST_API_TOKEN=${process.env.KV_REST_API_TOKEN}`);
    
  } catch (error) {
    console.error('Error setting up site:', error);
  } finally {
    rl.close();
  }
}

setupSite();