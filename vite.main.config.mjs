import { defineConfig, mergeConfig } from 'vite'
import {
  getBuildConfig,
  getBuildDefine,
  external,
  pluginHotRestart
} from './vite.base.config.mjs'

export default defineConfig(forgeEnv => {
  const { forgeConfigSelf } = forgeEnv
  const config = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry,
        fileName: () => '[name].cjs',
        formats: ['cjs']
      },
      rollupOptions: {
        external: [...external, 'electron/main']
      }
    },
    plugins: [
      ...(forgeEnv.forgeConfig.hotRestart
        ? [pluginHotRestart('restart')]
        : [])
    ],
    define: getBuildDefine(forgeEnv),
    resolve: {
      conditions: ['node'],
      mainFields: ['module', 'jsnext:main', 'jsnext']
    }
  }

  return mergeConfig(getBuildConfig(forgeEnv), config)
})
