# Legacy Scrobbler Changelog

## Version 1.0.3 - Repeat Scrobbles and Sync Improvements (2026-01-18)

- Added optional repeat scrobbling with de-conflicted timestamps.
- Added a per-device sync ledger (with last-played tracking) to avoid duplicates.
- Added post-sync scrobble summary with submitted/skipped lists and last-sync history.
- Added scan/upload status messaging, friendly loading phrases, and improved up-to-date view.
- Added manual safe-eject button (Windows/macOS) and clearer device-path errors.
- Added settings tooltips plus post-sync guidance to clear Play Counts when desired.
- Improved Play Counts deletion handling and device state refresh after sync.

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
