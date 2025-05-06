import { reactive, computed } from 'vue'

export const globalTracklist = reactive([])
export const selectedTracks = reactive([])
export const playtime = reactive(0)

export const scrobbled = reactive({ state: false, tracks: 0, playtime: 0 })

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
    selectedTracks.splice(0, selectedTracks.length)
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
    clearScrobbled,
    playtime: computed(calculatePlaytime),
    updateTracklist,
    clearTracklist,
    toggleTrackSelection
  }
}
