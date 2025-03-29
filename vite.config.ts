import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // Import the plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // Add the plugin
      registerType: 'autoUpdate', // Optional: auto update service worker
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Add other assets to cache if needed
      manifest: {
        name: 'TpCloud', // Replace with your app name
        short_name: 'VitePWA', // Replace with your short app name
        description: 'TpCloud Quotations', // Replace with your description
        theme_color: '#ffffff', // Replace with your theme color
        
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
