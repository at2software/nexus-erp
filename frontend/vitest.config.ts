import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        server: {
            deps: {
                // Directory-imports 'dayjs/esm', which Node's ESM loader rejects; Vite resolves it.
                inline: ['ngx-daterangepicker-material'],
            },
        },
    },
});
