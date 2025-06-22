import { OpenAI } from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded
dotenv.config({ path: '.env.development.local' });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Verify Cloudinary credentials before setup
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERROR: Cloudinary credentials missing in environment variables.');
  console.error('Please add the following to your .env.development.local file:');
  console.error('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.error('CLOUDINARY_API_KEY=your_api_key');
  console.error('CLOUDINARY_API_SECRET=your_api_secret');
}

// Setup Cloudinary with explicit credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Generates an image using OpenAI DALL-E
 */
async function generateImage(prompt, size = "1024x1024") {
  try {
    console.log(`Generating image with prompt: ${prompt}`);
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: size,
      quality: "hd",
      n: 1,
    });
    
    return response.data[0].url;
  } catch (error) {
    console.error("Error generating image:", error.message);
    return null;
  }
}

/**
 * Downloads an image from URL and returns as buffer
 */
async function downloadImage(url) {
  try {
    const response = await axios({
      url,
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error downloading image:", error.message);
    return null;
  }
}

/**
 * Checks if Cloudinary credentials are configured properly
 */
function verifyCloudinaryConfig() {
  if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
    console.error('❌ ERROR: Cloudinary configuration is incomplete.');
    console.error('Current config:', {
      cloud_name: cloudinary.config().cloud_name ? '[SET]' : '[MISSING]',
      api_key: cloudinary.config().api_key ? '[SET]' : '[MISSING]',
      api_secret: cloudinary.config().api_secret ? '[SET]' : '[MISSING]'
    });
    return false;
  }
  return true;
}

/**
 * Uploads an image to Cloudinary
 */
async function uploadToCloudinary(imageBuffer, folder, fileName) {
  // Verify configuration before attempting upload
  if (!verifyCloudinaryConfig()) {
    return null;
  }
  
  try {
    // Create a temporary file
    const tempPath = path.join(__dirname, `temp_${fileName}.png`);
    fs.writeFileSync(tempPath, imageBuffer);
    
    // Log detailed information for debugging
    console.log(`Uploading image to Cloudinary folder: bizbud/${folder}`);
    console.log(`Credentials status: ${cloudinary.config().cloud_name ? 'Cloud name set' : 'Missing cloud name'}, ${cloudinary.config().api_key ? 'API key set' : 'Missing API key'}`);
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        tempPath,
        { folder: `bizbud/${folder}` },
        (error, result) => {
          // Delete temp file
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
          
          if (error) {
            console.error('Cloudinary upload error details:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
    
    console.log(`✅ Successfully uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error.message);
    return null;
  }
}

/**
 * Generates and uploads all images needed for the site using the AI-generated prompts
 */
export async function generateSiteImages(clientData, siteId, siteConfig) {
  // Check if image generation is enabled
  if (siteConfig.GENERATE_IMAGES !== 'true') {
    console.log('Image generation is disabled in .site-config.env');
    return clientData;
  }
  
  // Verify all required API keys
  let configValid = true;
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables. Cannot generate images.');
    configValid = false;
  }
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ ERROR: Cloudinary credentials not found in environment variables:');
    console.error('- CLOUDINARY_CLOUD_NAME: ' + (process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing'));
    console.error('- CLOUDINARY_API_KEY: ' + (process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing'));
    console.error('- CLOUDINARY_API_SECRET: ' + (process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'));
    console.error('Please add these to your .env.development.local file.');
    configValid = false;
  }
  
  if (!configValid) {
    console.error('❌ Image generation and upload cancelled due to missing configuration.');
    return clientData;
  }
  
  console.log('\nGenerating images with AI using the specialized prompts...');
  const updatedClientData = { ...clientData };
  let uploadSuccess = false;
  
  // Generate logo
  if (clientData.logoPrompt) {
    console.log('\n1. Generating logo using prompt:');
    console.log(`   "${clientData.logoPrompt}"`);
    const logoUrl = await generateImage(clientData.logoPrompt);
    
    if (logoUrl) {
      const logoBuffer = await downloadImage(logoUrl);
      if (logoBuffer) {
        const cloudinaryLogoUrl = await uploadToCloudinary(logoBuffer, siteId, "logo");
        if (cloudinaryLogoUrl) {
          updatedClientData.logoUrl = cloudinaryLogoUrl;
          uploadSuccess = true;
          console.log('✅ Logo generated and uploaded successfully');
        } else {
          console.error('❌ Failed to upload logo to Cloudinary');
        }
      }
    }
  }
  
  
  // Generate gallery images
  if (clientData.gallery?.images?.length > 0) {
    console.log(`\n3. Generating ${clientData.gallery.images.length} gallery images...`);
    const updatedImages = [...clientData.gallery.images];
    
    for (let i = 0; i < updatedImages.length; i++) {
      const image = updatedImages[i];
      if (image.imagePrompt) {
        console.log(`\n   Image ${i+1}/${updatedImages.length} using prompt:`);
        console.log(`   "${image.imagePrompt}"`);
        
        const galleryUrl = await generateImage(image.imagePrompt);
        if (galleryUrl) {
          const galleryBuffer = await downloadImage(galleryUrl);
          if (galleryBuffer) {
            const cloudinaryGalleryUrl = await uploadToCloudinary(galleryBuffer, `${siteId}/gallery`, `gallery-${i+1}`);
            if (cloudinaryGalleryUrl) {
              updatedImages[i].src = cloudinaryGalleryUrl;
              uploadSuccess = true;
              console.log(`   ✅ Gallery image ${i+1} generated and uploaded successfully`);
            } else {
              console.error(`   ❌ Failed to upload gallery image ${i+1} to Cloudinary`);
            }
          }
        }
      }
    }
    
    updatedClientData.gallery.images = updatedImages;
  }
  
  if (uploadSuccess) {
    console.log('\n✅ AI-generated images uploaded to Cloudinary and client data updated');
  } else {
    console.error('\n❌ No images were successfully uploaded to Cloudinary');
  }
  
  return updatedClientData;
}