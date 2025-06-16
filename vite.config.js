import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs/promises'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add a simple mock API for saving client data
    {
      name: 'mock-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/save-client-data' && req.method === 'POST') {
            try {
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(chunk);
              }
              const buffer = Buffer.concat(chunks);
              const data = JSON.parse(buffer.toString());
              
              // Format JSON with indentation for readability
              const formattedData = JSON.stringify(data, null, 2);
              
              // Write to client.json
              await fs.writeFile(
                path.resolve(__dirname, 'public/client.json'),
                formattedData
              );
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Data saved successfully' }));
            } catch (error) {
              console.error('Error saving client data:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: false, 
                message: 'Failed to save client data',
                error: error.message 
              }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
})