const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { Redis } = require('@upstash/redis');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.development.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createSite() {
  try {
    console.log('===== BizBud Site Creation Wizard =====');
    
    // Get site information
    const siteId = await promptUser('Enter site ID (lowercase, no spaces): ');
    if (!siteId) {
      console.error('Site ID is required');
      return;
    }
    
    // Check if site already exists in Redis
    const existingData = await redis.get(`site:${siteId}:client`);
    if (existingData) {
      console.error(`Site with ID "${siteId}" already exists in Redis.`);
      return;
    }
    
    const siteTitle = await promptUser(`Enter site title [default: ${siteId}]: `) || siteId;
    const adminPassword = await promptUser('Enter admin password (min 6 characters): ');
    
    if (!adminPassword || adminPassword.length < 6) {
      console.error('Password must be at least 6 characters long');
      return;
    }
    
    // 1. Create a new repository from template
    console.log('\n1. Creating new site repository...');
    try {
      execSync(`gh repo create ${siteId} --public --template bizbud-template-site --clone`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error creating repository:', error.message);
      return;
    }
    
    // 2. Set up the site in Redis
    console.log('\n2. Setting up site in Redis...');
    try {
      // Create password hash
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      // Try to load default client.json
      const clientJsonPath = path.join(process.cwd(), siteId, 'public', 'client.json');
      let clientData = JSON.parse(fs.readFileSync(clientJsonPath, 'utf8'));
      
      // Update site title
      clientData.siteTitle = siteTitle;
      
      // Store in Redis
      await redis.set(`site:${siteId}:settings`, {
        adminPasswordHash: passwordHash,
        createdAt: new Date().toISOString()
      });
      
      await redis.set(`site:${siteId}:client`, clientData);
      
      // Update client.json with new title
      fs.writeFileSync(clientJsonPath, JSON.stringify(clientData, null, 2));
    } catch (error) {
      console.error('Error setting up site in Redis:', error.message);
      return;
    }
    
    // 3. Deploy to Vercel
    console.log('\n3. Deploying to Vercel...');
    try {
      process.chdir(siteId);
      
      // Create .env.local file with Redis credentials
      const envContent = `KV_REST_API_URL=${process.env.KV_REST_API_URL}\nKV_REST_API_TOKEN=${process.env.KV_REST_API_TOKEN}\n`;
      fs.writeFileSync('.env.local', envContent);
      
      // Link to Vercel and deploy
      console.log('Linking project to Vercel...');
      execSync('vercel link', { stdio: 'inherit' });
      
      console.log('Adding environment variables to Vercel...');
      execSync(`vercel env add KV_REST_API_URL production`, { stdio: 'inherit' });
      execSync(`vercel env add KV_REST_API_TOKEN production`, { stdio: 'inherit' });
      
      console.log('Deploying project...');
      execSync('vercel --prod', { stdio: 'inherit' });
      
      console.log(`\n✅ Site "${siteId}" created and deployed successfully!`);
      console.log(`Site URL: https://${siteId}.vercel.app`);
      console.log(`Admin URL: https://${siteId}.vercel.app/admin`);
      console.log(`\nRemember to set up your custom domain in Cloudflare.`);
    } catch (error) {
      console.error('Error deploying to Vercel:', error.message);
    }
  } catch (error) {
    console.error('Error creating site:', error);
  } finally {
    rl.close();
  }
}

createSite();