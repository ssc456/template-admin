import redis from './utils/redis';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests for login
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, siteId } = req.body;
    
    if (!password || !siteId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get site settings from Redis
    const siteSettings = await redis.get(`site:${siteId}:settings`);
    
    // If site doesn't exist or no password is set, use default password
    const storedHash = siteSettings?.adminPasswordHash || '$2a$12$TDVpKTt9jaQVSoitO7KnI.ZLMT1efjmOlg/hgQ2uHW/KylSw.in7e'; // Default: "admin123"
    
    // Compare password with stored hash
    const isValid = await bcrypt.compare(password, storedHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate a session token
    const sessionToken = uuidv4();
    
    // Store token in Redis with 24-hour expiry (86400 seconds)
    await redis.set(`auth:${sessionToken}`, siteId, { ex: 86400 });
    
    return res.status(200).json({ 
      success: true, 
      token: sessionToken,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}