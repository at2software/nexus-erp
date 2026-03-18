import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['ngx-color-picker'],
    force: false
  },
  ssr: {
    noExternal: ['ngx-color-picker']
  }
});
