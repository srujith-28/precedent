import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const stripePk =
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51UOthHHoPoB7rpEf5boSwkDVop1DAuTu7n334lhmFuuJ3BV6WrhKhKj4dkV0BvrbAVh047gYyWtSkPNmgqWMHd9k00cR1YapWo';

  return {
    define: {
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(stripePk),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
