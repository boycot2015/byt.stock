import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { viteMockServe } from 'vite-plugin-mock';
import { resolve } from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        viteMockServe({
            mockPath: 'src/mock',
            enable: true,
        }),
    ],
    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, 'src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                // manualChunks(id) {
                //   const pkgMap = {
                //     vue: ['vue', 'vue-router', 'pinia'],
                //     antdvue: ['ant-design-vue'],
                //     icons: ['ant-design-vue/es/icons-vue'],
                //     echarts: ['echarts', 'vue-echarts'],
                //     utils: ['axios', 'dayjs'],
                //   }
                //   for (const pkg of Object.keys(pkgMap)) {
                //     if (id.includes(pkg)) {
                //       return pkg
                //     }
                //   }
                // },
                manualChunks: {
                    vue: ['vue', 'vue-router', 'pinia'],
                    antdvue: ['ant-design-vue'],
                    echarts: ['echarts', 'vue-echarts'],
                    utils: ['axios', 'dayjs'],
                },
            },
            treeshake: {
                preset: 'recommended',
                manualPureFunctions: ['console.log'],
            },
        },
        outDir: 'dist',
    },
});
