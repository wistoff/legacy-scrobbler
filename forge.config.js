//const buildKeys = require('./build-scripts/build-keys')
const os = require('os')

// Function to construct the path based on architecture
function getAppPath (arch) {
  const platform = os.platform()
  if (platform === 'darwin') {
    if (arch) {
      return `${process.cwd()}/out/Legacy Scrobbler-darwin-${arch}/Legacy Scrobbler.app`
    } else {
      // If no architecture is provided, use the current platform's architecture
      return `${process.cwd()}/out/Legacy Scrobbler-darwin-${os.arch()}/Legacy Scrobbler.app`
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2); // Exclude first two elements 

// Extract architecture argument if present
const archIndex = args.indexOf('--arch');
const arch = archIndex !== -1 ? args[archIndex + 1] : undefined;

module.exports = {
  packagerConfig: {
    icon: './images/icon',
    // osxSign: {
    //   'hardened-runtime': true,
    //   entitlements: 'build-scripts/entitlements.plist',
    //   'entitlements-inherit': 'build-scripts/entitlements.plist',
    //   'signature-flags': 'library'
    // },
    // osxNotarize: {
    //   tool: 'notarytool',
    //   appleId: buildKeys.apple.appleId,
    //   appleIdPassword: buildKeys.apple.appleIdPassword,
    //   teamId: buildKeys.apple.teamId
    // }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {}
    },
    // {
    //   name: '@electron-forge/maker-zip',
    //   platforms: ['darwin']
    // },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: './images/dmg-background.png',
        format: 'ULFO',
        icon: './images/icon.icns',
        contents: [
          { x: 400, y: 150, type: 'link', path: '/Applications' },
          {
            x: 150,
            y: 150,
            type: 'file',
            path: getAppPath(arch)
          }
        ]
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs'
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs'
          },
          {
            entry: 'src/store.js',
            config: 'vite.store.config.mjs'
          }
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs'
          }
        ]
      }
    }
  ]
}
