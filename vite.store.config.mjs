import { defineConfig, mergeConfig } from 'vite'
import {
  getBuildConfig,
  external,
  pluginHotRestart
} from './vite.base.config.mjs'

export default defineConfig(forgeEnv => {
  const { forgeConfigSelf } = forgeEnv
  const config = {
    build: {
      rollupOptions: {
        external: [...external, 'electron/renderer'],
        input: forgeConfigSelf.entry,
        output: {
          format: 'cjs',
          codeSplitting: false,
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
          assetFileNames: '[name].[ext]'
        }
      }
    },
    plugins: [pluginHotRestart('reload')]
  }

  return mergeConfig(getBuildConfig(forgeEnv), config)
})
