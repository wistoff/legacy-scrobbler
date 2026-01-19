import { reactive, computed } from 'vue'

export const globalTracklist = reactive([])
export const selectedTracks = reactive([])
export const playtime = reactive(0)

export const scrobbled = reactive({
  state: false,
  tracks: 0,
  playtime: 0,
  submitted: [],
  skipped: []
})

export const scanSummary = reactive({
  alreadySyncedPlays: 0,
  foundTracks: 0,
  scannedAt: 0,
  playCountsPresent: false
})
export const lastSync = reactive({
  tracks: 0,
  playtime: 0,
  submitted: [],
  skipped: [],
  syncedAt: 0
})

export const useTracklist = () => {
  // Function to update the tracklist
  const updateTracklist = newTracklist => {
    globalTracklist.splice(0, globalTracklist.length, ...newTracklist)
    selectedTracks.splice(0, selectedTracks.length, ...newTracklist)
  }

  // Function to clear the tracklist
  const clearScrobbled  = async () => {
    scrobbled.tracks = 0
    scrobbled.playtime = 0
    scrobbled.state = false
    scrobbled.submitted.splice(0, scrobbled.submitted.length)
    scrobbled.skipped.splice(0, scrobbled.skipped.length)
    selectedTracks.splice(0, selectedTracks.length)
  }

  const setLastSync = (submitted, skipped, playtime) => {
    lastSync.tracks = submitted.length
    lastSync.playtime = playtime
    lastSync.submitted.splice(0, lastSync.submitted.length, ...submitted)
    lastSync.skipped.splice(0, lastSync.skipped.length, ...skipped)
    lastSync.syncedAt = Math.floor(Date.now() / 1000)
  }

  const clearLastSync = () => {
    lastSync.tracks = 0
    lastSync.playtime = 0
    lastSync.syncedAt = 0
    lastSync.submitted.splice(0, lastSync.submitted.length)
    lastSync.skipped.splice(0, lastSync.skipped.length)
  }

  const setScanSummary = (
    alreadySyncedPlays,
    foundTracks,
    scannedAt,
    playCountsPresent = true
  ) => {
    scanSummary.alreadySyncedPlays = alreadySyncedPlays
    scanSummary.foundTracks = foundTracks
    scanSummary.scannedAt = scannedAt
    scanSummary.playCountsPresent = playCountsPresent
  }

  const clearScanSummary = () => {
    scanSummary.alreadySyncedPlays = 0
    scanSummary.foundTracks = 0
    scanSummary.scannedAt = 0
    scanSummary.playCountsPresent = false
  }

  const setScrobbledSummary = (submitted, skipped) => {
    scrobbled.tracks = submitted.length
    scrobbled.submitted.splice(0, scrobbled.submitted.length, ...submitted)
    scrobbled.skipped.splice(0, scrobbled.skipped.length, ...skipped)
  }

  const clearTracklist = async () => {
    globalTracklist.splice(0, globalTracklist.length)
  }

  // Function to calculate total playtime
  const calculatePlaytime = () => {
    const totalPlaytimeSeconds = selectedTracks.reduce((acc, track) => {
      return acc + Math.floor(track.length / 1000) // Convert milliseconds to seconds
    }, 0)
    return totalPlaytimeSeconds
  }


  // Function to toggle track selection by ID
  const toggleTrackSelection = id => {
    const selectedTrackIndex = selectedTracks.findIndex(
      track => track.id === id
    )
    if (selectedTrackIndex !== -1) {
      // Track is in selectedTracks, remove it
      selectedTracks.splice(selectedTrackIndex, 1)
    } else {
      // Track is not in selectedTracks, add it
      const trackToAdd = globalTracklist.find(track => track.id === id)
      if (trackToAdd) {
        selectedTracks.push(trackToAdd)
      }
    }
  }

  return {
    tracklist: globalTracklist,
    selectedTracklist: selectedTracks,
    scrobbled: scrobbled,
    scanSummary: scanSummary,
    lastSync: lastSync,
    clearScrobbled,
    setScrobbledSummary,
    setScanSummary,
    clearScanSummary,
    setLastSync,
    clearLastSync,
    playtime: computed(calculatePlaytime),
    updateTracklist,
    clearTracklist,
    toggleTrackSelection
  }
}
