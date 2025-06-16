import redis from '../src/utils/redis';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { siteId, initialPassword, clientData } = req.body;
    
    if (!siteId || !initialPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if site already exists
    const existingData = await redis.get(`site:${siteId}:client`);
    if (existingData) {
      return res.status(409).json({ error: 'Site already exists' });
    }
    
    // Create password hash
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    
    // Set up site settings
    await redis.set(`site:${siteId}:settings`, {
      adminPasswordHash: passwordHash,
      createdAt: new Date().toISOString()
    });
    
    // Set up client data (use provided or default)
    let siteClientData = clientData;
    if (!siteClientData) {
      // Create minimal default data
      siteClientData = { 
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
    
    // Save client data
    await redis.set(`site:${siteId}:client`, siteClientData);
    
    return res.status(200).json({ 
      success: true,
      message: 'Site setup successful'
    });
  } catch (error) {
    console.error('Site setup error:', error);
    return res.status(500).json({ error: 'Failed to set up site' });
  }
}