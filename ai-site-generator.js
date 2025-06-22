import { generateSiteContent } from './generate-site-content.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      console.log(stdout);
      resolve(stdout);
    });
  });
};

async function generateAndCreateSite() {
  try {
    console.log('===== BizBud AI-Powered Site Generator =====\n');
    
    // Check for required environment variables
    const requiredVars = {
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
      'KV_REST_API_URL': process.env.KV_REST_API_URL,
      'KV_REST_API_TOKEN': process.env.KV_REST_API_TOKEN
    };
    
    if (siteConfig.GENERATE_IMAGES === 'true') {
      requiredVars['CLOUDINARY_CLOUD_NAME'] = process.env.CLOUDINARY_CLOUD_NAME;
      requiredVars['CLOUDINARY_API_KEY'] = process.env.CLOUDINARY_API_KEY;
      requiredVars['CLOUDINARY_API_SECRET'] = process.env.CLOUDINARY_API_SECRET;
    }
    
    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([name]) => name);
      
    if (missingVars.length > 0) {
      console.error('❌ ERROR: Missing required environment variables:');
      missingVars.forEach(name => console.error(`- ${name}`));
      console.error('Please add these to your .env.development.local file.');
      return;
    }
    
    // Step 1: Generate schema-validated content with AI
    console.log('Step 1/2: Generating site content with AI...\n');
    const contentResult = await generateSiteContent();
    
    if (!contentResult) {
      console.error('Content generation failed. Exiting...');
      return;
    }
    
    // Step 2: Create the site with the generated content
    console.log('\nStep 2/2: Creating and deploying site...\n');
    
    // Pass all required parameters to avoid prompts
    await runCommand(
      `node create-client-site.js --siteId=${contentResult.siteId} --jsonPath=${contentResult.jsonPath} --password=${siteConfig.SITE_PASSWORD} --siteTitle="${contentResult.businessName}"`
    );
    
    console.log('\n✅ Complete site creation process finished!');
    
  } catch (error) {
    console.error('Error in AI site generation process:', error);
  }
}

generateAndCreateSite();