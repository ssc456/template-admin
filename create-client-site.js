import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
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

// Helper to run commands
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

async function createClientSite() {
  try {
    console.log('===== BizBud Client Site Creator =====\n');
    
    // Gather site information
    const siteId = await rl.question('Enter site ID (lowercase, no spaces): ');
    
    if (!siteId) {
      console.error('Site ID is required');
      return;
    }
    
    // Check if site exists
    const exists = await redis.get(`site:${siteId}:client`);
    if (exists) {
      console.error(`Site "${siteId}" already exists in Redis`);
      return;
    }
    
    const siteTitle = await rl.question(`Enter site title [default: ${siteId}]: `) || siteId;
    const password = await rl.question('Enter admin password (min 6 characters): ');
    
    if (!password || password.length < 6) {
      console.error('Password must be at least 6 characters');
      return;
    }
    
    console.log('\n1. Creating Redis entry...');
    
    // Create password hash
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create default client data
    const clientData = {
      siteTitle: siteTitle,
      logoUrl: "/logo.svg",
      hero: {
        headline: "Welcome to " + siteTitle,
        subheadline: "Your premier service provider",
        ctaText: "Get Started",
        ctaLink: "#contact"
      },
      config: {
        showHero: true,
        showAbout: true,
        showServices: true,
        showFeatures: true,
        showTestimonials: true,
        showContact: true,
        showFAQ: true,
        primaryColor: "blue"
      }
    };
    
    // Store in Redis
    await redis.set(`site:${siteId}:settings`, {
      adminPasswordHash: passwordHash,
      createdAt: new Date().toISOString()
    });
    
    await redis.set(`site:${siteId}:client`, clientData);
    
    console.log('2. Creating GitHub repository...');
    try {
      await runCommand(`gh repo create ${siteId} --public --template bizbud-template-site --clone`);
    } catch (err) {
      console.error('Failed to create repository:', err.message);
      return;
    }
    
    console.log('3. Setting up environment variables...');
    const envContent = `KV_REST_API_URL=${process.env.KV_REST_API_URL}\nKV_REST_API_TOKEN=${process.env.KV_REST_API_TOKEN}\n`;
    fs.writeFileSync(path.join(process.cwd(), siteId, '.env.local'), envContent);
    
    console.log('4. Deploying to Vercel...');
    try {
      process.chdir(siteId);
      
      // First deploy to get the project set up
      await runCommand('vercel --yes');
      
      // Add environment variables directly with their values
      console.log('Adding environment variables to Vercel...');
      const redisUrl = process.env.KV_REST_API_URL;
      const redisToken = process.env.KV_REST_API_TOKEN;
      
      if (!redisUrl || !redisToken) {
        console.error('Redis environment variables not found!');
        return;
      }
      
      // Use echo to provide input to Vercel env command
      await runCommand(`echo ${redisUrl} | vercel env add KV_REST_API_URL production`);
      await runCommand(`echo ${redisToken} | vercel env add KV_REST_API_TOKEN production`);
      await runCommand(`echo ${siteId} | vercel env add VITE_SITE_ID production`);
      
      // Redeploy to production with the new environment variables
      console.log('Deploying with environment variables...');
      await runCommand('vercel --prod');
    } catch (err) {
      console.error('Failed to deploy to Vercel:', err.message);
    }
    
    console.log('\n✅ Site created successfully!');
    console.log(`Site URL: https://${siteId}.vercel.app`);
    console.log(`Admin URL: https://${siteId}.vercel.app/admin`);
    
  } catch (error) {
    console.error('Error creating site:', error);
  } finally {
    rl.close();
  }
}

createClientSite();