# Legacy Scrobbler Changelog

## Version 1.0.3 - Tray Mode, Dark Mode & Repeat Scrobbles (2026-01-21)

### New Features
- **Tray mode**: App now runs in the system tray with headless startup, reducing memory usage. Click the tray icon to open the window.
- **Background device detection**: Detects iPod connections while running in the background and prompts to start scrobbling.
- **Dark mode**: Toggle between light and dark themes with preference saving.
- **Repeat scrobbling**: Tracks played multiple times now scrobble correctly with de-conflicted timestamps. Play count badges (e.g., "3x") shown in track list.
- **Per-device sync ledger**: Prevents re-scrobbling by tracking last-played timestamps per device.
- **Offline support**: Network connectivity detection with offline banner and tap-to-retry for failed scrobbles.
- **Safe eject button**: Manual eject for Windows and macOS.

### Improvements
- Scan progress indicator showing track count and percentage during database read.
- Tray tooltip displays "Last scrobbled" timestamp.
- Single-instance lock prevents duplicate background processes.
- Settings tooltips for better understanding.
- Improved device-path error handling.

### Dependencies
- Electron 24 → 39, Vite 4 → 6, Vue 3.2 → 3.5

## Version 1.0.2 - Improved Handling of Failed Scrobbles

- Implemented a mechanism proposed in a pull request to retry scrobbling individual tracks when a batch scrobble request fails.
- Tracks that could not be scrobbled are now displayed in a popup for user visibility.

### Known Issues
- Songs played multiple times are scrobbled only once.

## Version 1.0.1 - Improved Login (2024-13-05)

- Improved login process by implementing a confirmation popup after authenticating via browser due to unreliable auto-detection, particularly on Windows.
- Initial settings for "Automatic Library Scan" and "Automatic Delete" are not set to false.
- Streamlined login process by relocating the login button from Settings to the login popup only.
- Implemented automatic closure of the menu upon logging out or resetting configuration, prompting users to reconnect.

### Known Issues
- Songs played multiple times are scrobbled only once.

## Version 1.0.0 - Initial Release (2024-01-05)

- Introducing Legacy Scrobbler, a tool to sync listening history from iPod to Last.fm.

### Known Issues
- Songs played multiple times are scrobbled only once.
