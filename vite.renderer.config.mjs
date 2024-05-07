import { defineConfig } from 'vite'
import { pluginExposeRenderer } from './vite.base.config.mjs'
import vue from '@vitejs/plugin-vue' // Import the Vue plugin

// https://vitejs.dev/config
export default defineConfig(env => {
  /** @type {import('vite').ConfigEnv<'renderer'>} */
  const forgeEnv = env
  const { root, mode, forgeConfigSelf } = forgeEnv
  const name = forgeConfigSelf.name ?? ''

  /** @type {import('vite').UserConfig} */
  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`
    },
    plugins: [
      vue(), // Add the Vue plugin here
      pluginExposeRenderer(name)
    ],
    resolve: {
      preserveSymlinks: true
    },
    clearScreen: false
  }
})
