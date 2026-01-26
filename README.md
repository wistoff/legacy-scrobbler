<div align="center">
  <div>
    <img width="64px" src="/src/renderer/assets/ls-logo.png">
  </div>
  <div>
    <h1>Legacy Scrobbler</h1>
  </div>
</div>

[![Version](https://img.shields.io/badge/version-1.0.3-blue.svg)](https://legacyscrobbler.software)
[![GitHub stars](https://img.shields.io/github/stars/wistoff/legacy-scrobbler.svg)](https://github.com/wistoff/legacy-scrobbler/stargazers)
![Electron](https://img.shields.io/badge/Electron-24.2.0-teal.svg)
![Vue](https://img.shields.io/badge/Vue-3.2.47-green.svg)
[![License](https://img.shields.io/badge/license-GPLv3-lightgray.svg)](https://github.com/wistoff/legacy-scrobbler/blob/main/LICENSE)


![Screencast](/images/screencast.gif)

Legacy Scrobbler is designed to bridge the gap between legacy hardware, and the music platform [Last.fm](last.fm). It enables users to sync their listening history from offline devices to their Last.fm profile, preserving their music legacy in the digital era.

**Download**: [Legacy Scrobbler Releases](https://github.com/wistoff/legacy-scrobbler/releases)

## How to Use

### Setting Up Legacy Scrobbler
- Download the latest release.
- Install the application by following the on-screen instructions.
- Connect your iPod to your System using a compatible cable.

**macOS Users**: If you see a warning that the app is damaged and can't be opened, run this command in Terminal after installation:
```bash
xattr -cr "/Applications/Legacy Scrobbler.app"
```

### Syncing Tracks
1. Launch Legacy Scrobbler.
2. Authorize Legacy Scrobbler to access your Last.fm account.
3. Once authorized, Legacy Scrobbler will automatically detect your connected iPod.
4. Adjust the following settings to your needs.
5. Closing the window keeps Legacy Scrobbler running in the background; reopen it from the tray/menu bar icon.

### Tray Mode
- The tray icon keeps the app running in the background so it can detect your iPod.
- Hover the tray icon to see the last scrobble time.

## Please Notice
- If you use iTunes/Apple Music to sync your iPod this will erase the Play Counts File, in order to scrobble your recent Plays do not sync before using Legacy Scrobbler 

## Settings
![Settings](/images/settings.png)
- **Automatic Library Scan**: Automatically scans the library for new tracks if a device is connected.
- **Automatic Delete**: Removes the Play Counts file after a successful sync. Only needed if you want to prevent iTunes or other scrobblers from importing old plays.
- **Automatic Upload**: Automatically uploads the scrobbles to your Last.fm profile.
- **Scrobble Repeat Plays**: Automatically scrobbles repeat plays (timestamps are estimated).
- **Dark Mode**: Toggle between light and dark themes.
- **Device Path**: Change the default device path to match the home folder of your iPod.

## Building from Source

### Prerequisites
- Node.js installed on your system.

### Building Legacy Scrobbler
1. Clone the repository: `git clone https://github.com/wistoff/legacy-scrobbler.git`
2. Navigate to the project directory: `cd legacy-scrobbler`
3. Install dependencies: `npm install`
4. Run the application in development mode: `npm run start`
5. To build the application for distribution: `npm run make`

### Building for different platforms:

**MacOs Silicon:** ``npm run make -- --arch=arm64 --platform=darwin``<br>
**MacOs Apple Intel:** ``npm run make -- --arch=x64 --platform=darwin``<br>
**Windows 64-Bit:** ``npm run make -- --arch="x64" --platform=win32``<br>
**Windows 32-Bit:** ``npm run make -- --arch="ia32" --platform=win32``<br>
<br>
When compiling for MacOs add ``"appdmg": "^0.6.6",`` to the devDependencies in package.json 

## Features
- Sync tracks from iPod to Last.fm profile.
- Preserve offline listening history digitally.
- Simple and intuitive interface for easy navigation.
- Tray mode for background detection and quick access.

## Known Issues
- Exact per-play timestamps are not available from iPod Play Counts. When "Scrobble Repeat Plays" is enabled, Legacy Scrobbler approximates repeat plays using track length and spacing.
- Once you've set the path to the iPod, you may need to restart the application. 

## Tested Devices

| Device              | Compatibility      |
|---------------------|--------------------|
| iPod Classic 1st Gen| ✅                 |
| iPod Classic 2nd Gen| -                 |
| iPod Classic 3rd Gen| -                 |
| iPod Classic 4th Gen| ✅                 |
| iPod Classic 5th Gen| ✅                |
| iPod Classic 6th Gen| ✅                 |
| iPod Classic 6.5th Gen| ✅               |
| iPod Nano 3rd Gen| ✅                   |
| iPod Nano 4th Gen| ✅                   |

If you tested another device and can confirm it's working, please let me know. 

## Tested on Operating Systems

- macOS: ✅
- Windows: ✅
- Linux: ❓

## Changelog
View the [changelog](CHANGELOG.md) for a detailed history of changes across releases.

## Credits
- Legacy Scrobbler uses icons from [Iconoir](https://iconoir.com/) under the [MIT License](https://github.com/iconoir-icons/iconoir/blob/main/LICENSE)
- Legacy Scrobbler uses [Barlow Font](https://github.com/jpt/barlow) under the [OFL License](https://github.com/jpt/barlow/blob/master/OFL.txt)
- Legacy Scrobbler is inspired by the [AudioPod](https://web.archive.org/web/20061013214007/http://projects.afterglo.ws/wiki/AudioPodHome) software from 2005, Java tool that parsed iPod data for Last.fm submission.


## Disclaimer
Legacy Scrobbler is a third-party tool developed independently. Last.fm and iPod are registered trademarks of their respective owners. Legacy Scrobbler is not endorsed by or affiliated with Last.fm or Apple Inc.
