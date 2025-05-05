import { reactive, readonly } from 'vue'

const _trackStatuses = reactive([])

const addTrackStatus = (track, status = 'pending') => {
  _trackStatuses.push({
    track,
    status
  })
}

const updateTrackStatus = (index, newStatus) => {
  if (_trackStatuses[index]) {
    _trackStatuses[index].status = newStatus
  }
}

const clearTrackStatuses = () => {
  _trackStatuses.splice(0, _trackStatuses.length)
}

export const useTrackStatuses = () => {
  return {
    trackStatuses: readonly(_trackStatuses),
    addTrackStatus,
    updateTrackStatus,
    clearTrackStatuses
  }
}

