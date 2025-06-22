import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import minimist from 'minimist';

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const argSiteId = argv.siteId;
const argJsonPath = argv.jsonPath;
const argPassword = argv.password;
const argSiteTitle = argv.siteTitle;

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.development.local' });

// Load site configuration
const siteConfigPath = path.join(__dirname, '.site-config.env');
const siteConfig = fs.existsSync(siteConfigPath) 
  ? Object.fromEntries(
      fs.readFileSync(siteConfigPath, 'utf8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
          const [key, ...valueParts] = line.split('=');
          return [key.trim(), valueParts.join('=').trim()];
        })
    )
  : {};

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
    
    // Get site information from args, config file, or default values
    const siteId = argSiteId || siteConfig.SITE_ID;
    
    if (!siteId) {
      console.error('Site ID is required. Provide it via --siteId argument or SITE_ID in .site-config.env');
      return;
    }
    
    // Check if site exists
    const exists = await redis.get(`site:${siteId}:client`);
    if (exists) {
      console.error(`Site "${siteId}" already exists in Redis`);
      return;
    }
    
    const password = argPassword || siteConfig.SITE_PASSWORD;
    
    if (!password || password.length < 6) {
      console.error('Password must be at least 6 characters. Set it via --password arg or SITE_PASSWORD in .site-config.env');
      return;
    }
    
    const siteTitle = argSiteTitle || siteConfig.SITE_TITLE || siteId;
    
    console.log(`Creating site with ID: ${siteId}`);
    console.log(`Site title: ${siteTitle}`);
    console.log('\n1. Creating Redis entry...');
    
    // Create password hash
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create default client data using the full template
    console.log('Loading template client data...');
    const clientJsonPath = argJsonPath || path.join(__dirname, 'public', 'client.json');
    let clientData;
    
    try {
      // Read the full client.json template with all default content
      clientData = JSON.parse(fs.readFileSync(clientJsonPath, 'utf8'));
      
      // Only update the site title
      clientData.siteTitle = siteTitle;
      
      // Update brand color if specified
      if (siteConfig.BRAND_COLOR && clientData.config) {
        clientData.config.primaryColor = siteConfig.BRAND_COLOR;
      }
      
      console.log('Template data loaded successfully');
    } catch (error) {
      console.warn('Warning: Could not load full client template, using minimal default');
      // Fallback to minimal configuration
      clientData = {
        siteTitle: siteTitle,
        logoUrl: "/images/logo.png",
        hero: {
          headline: "Welcome to " + siteTitle,
          subheadline: "Your premier service provider",
          ctaText: "Get Started",
          ctaLink: "#contact"
        },
        config: {
          primaryColor: siteConfig.BRAND_COLOR || "blue",
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
      
      // Add environment variables using a Windows-compatible approach
      console.log('Adding environment variables to Vercel...');
      
      // Create temporary files for environment variables
      const setEnvVar = async (name, value) => {
        const tempFile = path.join(process.cwd(), `.temp_${name}`);
        fs.writeFileSync(tempFile, value.trim());
        try {
          await runCommand(`vercel env add ${name} production < ${tempFile}`);
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        }
      };
      
      const redisUrl = process.env.KV_REST_API_URL;
      const redisToken = process.env.KV_REST_API_TOKEN;
      const cloudinaryName = process.env.CLOUDINARY_CLOUD_NAME;
      const cloudinaryKey = process.env.CLOUDINARY_API_KEY;
      const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
      
      try {
        await setEnvVar('KV_REST_API_URL', redisUrl);
        await setEnvVar('KV_REST_API_TOKEN', redisToken);
        await setEnvVar('VITE_SITE_ID', siteId);
        
        // Add Cloudinary credentials
        if (cloudinaryName && cloudinaryKey && cloudinarySecret) {
          await setEnvVar('CLOUDINARY_CLOUD_NAME', cloudinaryName);
          await setEnvVar('CLOUDINARY_API_KEY', cloudinaryKey);
          await setEnvVar('CLOUDINARY_API_SECRET', cloudinarySecret);
          console.log('Added Cloudinary environment variables');
        } else {
          console.warn('Cloudinary credentials not found in environment variables');
          console.warn('Please add them manually in the Vercel dashboard');
        }
        
        // Redeploy with the new environment variables
        console.log('Deploying with environment variables...');
        await runCommand('vercel --prod');
      } catch (envError) {
        console.error('Error setting environment variables:', envError.message);
      }
    } catch (err) {
      console.error('Failed to deploy to Vercel:', err.message);
    }
    
    console.log('\n✅ Site created successfully!');
    console.log(`Site URL: https://${siteId}.vercel.app`);
    console.log(`Admin URL: https://${siteId}.vercel.app/admin`);
    
  } catch (error) {
    console.error('Error creating site:', error);
  }
}

createClientSite();