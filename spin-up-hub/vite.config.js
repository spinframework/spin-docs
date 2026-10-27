import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuex from 'vuex'

import path from "path";
const pathSrc = path.resolve(__dirname, "./src");

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // `@use` must precede `@import`. The component styles below use the
        // modern color API (color.adjust), which needs sass:color loaded here.
        additionalData: `
          @use "sass:color";
          @import "../../static/sass/styles.scss";
        `,
        // Our scss/.vue styles are migrated to the modern color API; the
        // remaining deprecations come from the vendored @fermyon/styleguide,
        // which we can't edit. `import` is silenced because our sources use
        // @import.
        silenceDeprecations: ["import", "color-functions", "global-builtin", "legacy-js-api"],
      }
    }
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
