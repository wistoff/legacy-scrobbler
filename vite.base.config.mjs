import { builtinModules, createRequire } from 'node:module'
import { styleText } from 'node:util'

import { requestAppRestart } from '@electron-forge/core-utils/restart'

const require = createRequire(import.meta.url)
const packageJson = require('./package.json')

export const builtins = [
  'electron',
  'electron/common',
  ...builtinModules.map(module => [module, `node:${module}`]).flat()
]

export const external = [
  ...builtins,
  ...Object.keys(packageJson.dependencies || {})
]

const viteDevServers = {}
const viteDevServerUrls = {}

/** @type {(env: import('vite').ConfigEnv<'build'>) => import('vite').UserConfig} */
export const getBuildConfig = env => {
  const { root, mode, command } = env

  return {
    root,
    mode,
    build: {
      copyPublicDir: false,
      emptyOutDir: false,
      outDir: '.vite/build',
      watch: command === 'serve' ? { exclude: '**/.git/**' } : null,
      minify: command === 'build'
    },
    clearScreen: false
  }
}

export const getDefineKeys = names => {
  return names.reduce((define, name) => {
    const normalizedName = name.toUpperCase().replaceAll('-', '_')
    return {
      ...define,
      [name]: {
        VITE_DEV_SERVER_URL: `${normalizedName}_VITE_DEV_SERVER_URL`,
        VITE_NAME: `${normalizedName}_VITE_NAME`
      }
    }
  }, {})
}

export const getBuildDefine = env => {
  const { command, forgeConfig } = env
  const names = forgeConfig.renderer
    .filter(({ name }) => name != null)
    .map(({ name }) => name)
  const defineKeys = getDefineKeys(names)

  return Object.entries(defineKeys).reduce((define, [name, keys]) => {
    const { VITE_DEV_SERVER_URL, VITE_NAME } = keys
    return {
      ...define,
      [VITE_DEV_SERVER_URL]: command === 'serve'
        ? JSON.stringify(viteDevServerUrls[VITE_DEV_SERVER_URL])
        : undefined,
      [VITE_NAME]: JSON.stringify(name)
    }
  }, {})
}

const resolveDevHost = host => {
  if (typeof host !== 'string' || host === '0.0.0.0' || host === '::') {
    return 'localhost'
  }
  return host.includes(':') ? `[${host}]` : host
}

export const pluginExposeRenderer = name => {
  const { VITE_DEV_SERVER_URL } = getDefineKeys([name])[name]

  return {
    name: '@electron-forge/plugin-vite:expose-renderer',
    configureServer (server) {
      viteDevServers[name] = server
      server.httpServer?.once('listening', () => {
        const addressInfo = server.httpServer?.address()
        viteDevServerUrls[VITE_DEV_SERVER_URL] =
          `http://${resolveDevHost(server.config.server.host)}:${addressInfo?.port}`
      })
    }
  }
}

export const pluginHotRestart = command => {
  let builtOnce = false

  return {
    name: `@electron-forge/plugin-vite:hot-${command}`,
    closeBundle (error) {
      const isRebuild = builtOnce
      builtOnce = true

      if (error) return

      if (command === 'reload') {
        for (const server of Object.values(viteDevServers)) {
          server.ws.send({ type: 'full-reload' })
        }
      } else if (command === 'restart' && !requestAppRestart() && isRebuild) {
        console.warn(styleText(
          'yellow',
          '[@electron-forge/plugin-vite] Main process rebuilt, but the running app was not restarted.'
        ))
      }
    }
  }
}
