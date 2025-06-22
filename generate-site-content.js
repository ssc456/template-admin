import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';
import dotenv from 'dotenv';
import { generateSiteImages } from './image-generator.js';

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

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

// Define the schema for the client.json (no changes to schema)
const serviceDetailItem = z.string();

const serviceItem = z.object({
  title: z.string(),
  description: z.string(),
  iconName: z.string(),
  details: z.array(serviceDetailItem)
});

const featureItem = z.object({
  iconName: z.string(),
  title: z.string(),
  description: z.string()
});

const galleryImage = z.object({
  src: z.string(),
  alt: z.string(),
  title: z.string(),
  description: z.string()
});

const testimonialQuote = z.object({
  name: z.string(),
  quote: z.string(),
  image: z.string()
});

const faqItem = z.object({
  question: z.string(),
  answer: z.string()
});

// Update the ClientSiteSchema to include prompt fields

const ClientSiteSchema = z.object({
  siteTitle: z.string(),
  logoUrl: z.string(),
  logoPrompt: z.string(), // New field for logo image generation
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
    ctaText: z.string(),
    ctaLink: z.string()
  }),
  about: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    imagePrompt: z.string() // New field for about image generation
  }),
  services: z.object({
    title: z.string(),
    description: z.string(),
    layoutStyle: z.enum(['interactive', 'cards', 'simple']),
    items: z.array(serviceItem)
  }),
  features: z.object({
    title: z.string(),
    items: z.array(featureItem)
  }),
  gallery: z.object({
    title: z.string(),
    subtitle: z.string(),
    layout: z.enum(['masonry', 'grid', 'carousel']),
    maxImages: z.number(),
    viewAllLink: z.string(),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      title: z.string(),
      description: z.string(),
      imagePrompt: z.string() // New field for each gallery image
    }))
  }),
  testimonials: z.object({
    title: z.string(),
    quotes: z.array(testimonialQuote)
  }),
  faq: z.object({
    title: z.string(),
    items: z.array(faqItem)
  }),
  social: z.object({
    facebook: z.string(),
    instagram: z.string(),
    twitter: z.string(),
    linkedin: z.string(),
    youtube: z.string(),
    tiktok: z.string()
  }),
  contact: z.object({
    title: z.string(),
    description: z.string(),
    email: z.string().email(),
    phone: z.string(),
    address: z.string()
  }),
  config: z.object({
    primaryColor: z.enum(['blue', 'green', 'purple', 'pink', 'red', 'yellow']),
    showHero: z.boolean(),
    showAbout: z.boolean(),
    showServices: z.boolean(),
    showFeatures: z.boolean(),
    showTestimonials: z.boolean(),
    showGallery: z.boolean(),
    showContact: z.boolean(),
    showFAQ: z.boolean()
  })
});

// Function to check if site-info.txt exists and read its contents
function readSiteInfoFile() {
  const siteInfoPath = path.join(__dirname, 'site-info.txt');
  if (fs.existsSync(siteInfoPath)) {
    return fs.readFileSync(siteInfoPath, 'utf8');
  }
  return '';
}

async function generateSiteContent() {
  try {
    console.log('===== AI-Powered BizBud Site Generator =====\n');
    
    // Get site ID from config file instead of prompting
    const siteId = siteConfig.SITE_ID;
    
    if (!siteId) {
      console.error('Site ID is required. Set SITE_ID in .site-config.env');
      return null;
    }
    
    console.log(`Using site ID: ${siteId}`);
    
    // Read business information from site-info.txt
    const siteInfo = readSiteInfoFile();
    if (!siteInfo) {
      console.log('\n⚠️ No site-info.txt file found or file is empty.');
      console.log('AI will generate complete content from minimal information.');
      console.log('For better results, create a site-info.txt file with business details.');
    } else {
      console.log('\n✅ Found site-info.txt with business information');
    }
    
    // Get brand color from config
    const brandColor = siteConfig.BRAND_COLOR || 'blue';
    console.log(`Using brand color: ${brandColor}`);
    
    console.log('\nGenerating customized content with AI. This may take a moment...');
    
    // Create system prompt for OpenAI with enhanced instructions for sparse data
    const systemPrompt = `
    You are a professional website content creator specializing in small business websites.
    Create a complete client.json file for a business website using the information provided below.
    
    Business information provided:
    ${siteInfo || 'Minimal information. Use creativity to generate appropriate content.'}
    
    Preferred brand color: ${brandColor}

    Use these guidelines:
    1. Use appropriate Lucide icon names for services and features (e.g., ShieldCheck, Clock, Heart, Star, Zap) that match the service/feature
    2. Create realistic, full, padded even, engaging content for the business. I need lots of text content
    3. If information is sparse or missing, GENERATE realistic content that would be appropriate for this type of business, again lots of this please!

    IMPORTANT - For each image in the site, create a detailed image prompt that will be used to generate AI images:
    - Create a logoPrompt that describes a professional, modern logo for this business (be specific about style, colors, elements)
    - For each gallery image, create a unique imagePrompt that would generate a high-quality, relevant image for this business

    All image prompts should be detailed (30-50 words), specific

    5. For all other fields, generate professional and engaging content as before
    6. For social media platforms that don't apply to this business, use empty strings (e.g., "")
    7. For testimonials use randomuser.me placeholders
    `;

    // Call OpenAI API with Zod schema enforcement
    const response = await openai.responses.parse({
      model: "gpt-4o", // Use the latest model available
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate a complete, professional site configuration based on the provided information. Be creative where information is missing." }
      ],
      text: {
        format: zodTextFormat(ClientSiteSchema, "clientData")
      }
    });

    // Extract the schema-validated content with AI-generated image prompts
    const clientData = response.output_parsed;
    
    // Generate images using the AI-generated prompts if enabled
    if (siteConfig.GENERATE_IMAGES === 'true') {
      console.log('\nGenerating images with AI based on specialized prompts...');
      const updatedClientData = await generateSiteImages(clientData, siteId, siteConfig);
      
      // Save the updated client data with image URLs
      const tempJsonPath = path.join(__dirname, `${siteId}-client.json`);
      fs.writeFileSync(tempJsonPath, JSON.stringify(updatedClientData, null, 2));
      
      console.log('✅ Updated client data with AI-generated images');
      
      return {
        siteId,
        businessName: updatedClientData.siteTitle,
        clientData: updatedClientData,
        jsonPath: tempJsonPath
      };
    } else {
      // Save the generated content without images
      const tempJsonPath = path.join(__dirname, `${siteId}-client.json`);
      fs.writeFileSync(tempJsonPath, JSON.stringify(clientData, null, 2));
      
      return {
        siteId,
        businessName: clientData.siteTitle,
        clientData,
        jsonPath: tempJsonPath
      };
    }
    
  } catch (error) {
    if (error.response && error.response.errors) {
      // Handle schema validation errors from the API
      console.error('Schema validation failed:');
      console.error(JSON.stringify(error.response.errors, null, 2));
    } else {
      console.error('Error generating site content:', error);
    }
    return null;
  }
}

// Export for use in other scripts
export { generateSiteContent };

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await generateSiteContent();
    
    if (result) {
      // Ask if user wants to continue with site creation
      const createSite = await rl.question('\nDo you want to create the site with this content? (yes/no): ');
      
      if (createSite.toLowerCase() === 'yes' || createSite.toLowerCase() === 'y') {
        console.log('\nLaunching site creation process...');
        await runCommand(`node create-client-site.js --siteId=${result.siteId} --jsonPath=${result.jsonPath}`);
      } else {
        console.log('\nSite creation cancelled. You can manually create the site later using:');
        console.log(`node create-client-site.js --siteId=${result.siteId} --jsonPath=${result.jsonPath}`);
      }
    }
  } catch (error) {
    console.error('Execution error:', error);
  } finally {
    rl.close();
  }
}