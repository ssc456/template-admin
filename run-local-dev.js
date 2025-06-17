import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';
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

// Helper to run commands
const runCommand = (command, cwd) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (stderr) console.log(`stderr: ${stderr}`);
      if (stdout) console.log(`stdout: ${stdout}`);
      
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
};

async function setupLocalDev() {
  try {
    console.log('===== BizBud Local Dev Setup =====\n');
    
    // Ask which site to test
    const siteId = await rl.question('Enter site ID to test locally: ');
    
    if (!siteId) {
      console.error('Site ID is required');
      return;
    }
    
    // Copy the template-site directory to a local dev directory
    const localDevDir = path.join(__dirname, 'local-dev-site');
    
    // Check if directory exists
    if (fs.existsSync(localDevDir)) {
      const overwrite = await rl.question('Local dev directory already exists. Overwrite? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Exiting without changes.');
        return;
      }
      
      // Remove existing directory
      console.log('Removing existing local dev directory...');
      fs.rmSync(localDevDir, { recursive: true, force: true });
    }
    
    // Copy template-site to local-dev-site
    console.log('Copying template-site to local-dev-site...');
    fs.cpSync(path.join(__dirname, '..', 'template-site'), localDevDir, { recursive: true });
    
    // Create .env.local file with Redis credentials and site ID
    console.log('Setting up environment variables...');
    const envContent = `VITE_SITE_ID=${siteId}\nKV_REST_API_URL=${process.env.KV_REST_API_URL}\nKV_REST_API_TOKEN=${process.env.KV_REST_API_TOKEN}\n`;
    fs.writeFileSync(path.join(localDevDir, '.env.local'), envContent);
    
    // Install dependencies
    console.log('Installing dependencies...');
    await runCommand('npm install', localDevDir);
    
    // Start development server
    console.log('\n✅ Local development environment set up!');
    console.log(`\nTo start the local development server:`);
    console.log(`1. Navigate to the local dev directory: cd ${path.relative(process.cwd(), localDevDir)}`);
    console.log(`2. Start the server: npm run dev`);
    console.log(`\nThen access your site at http://localhost:5173?site=${siteId}`);
    
  } catch (error) {
    console.error('Error setting up local dev:', error);
  } finally {
    rl.close();
  }
}

setupLocalDev();