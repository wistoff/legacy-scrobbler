import { parsePlayCounts } from './playCounts.mjs'

const { open } = require('fs/promises')

const debugEnabled = process.env.NODE_ENV !== 'production'
const logDebug = (...args) => {
  if (debugEnabled) {
    console.log('[debug]', ...args)
  }
}

async function parseItunesDb (filePath, onProgress) {
  const tracklist = []
  try {
    console.log('Reading iTunesDB file:', filePath)
    logDebug('parseItunesDb start', { filePath })
    const handler = await open(filePath, 'r')

    // Get file size for progress calculation
    const stats = await handler.stat()
    const fileSize = stats.size

    let totalBytesRead = 0
    let lastProgressUpdate = 0

    const bufferSize = 1 * 1024 * 1024 // 1 MB buffer size

    const buffer = Buffer.alloc(bufferSize)

    while (true) {
      const bytesRead = await readBytesAtPosition(
        handler,
        buffer,
        totalBytesRead,
        bufferSize
      )
      for (let i = 0; i < bytesRead; i++) {
        const byte = buffer[i]
        if (byte === 109 && bytesRead - i >= 4) {
          const nextBytes = buffer.toString('utf8', i + 1, i + 4)
          if (nextBytes === 'hit') {
            const track = await parseMhit(handler, totalBytesRead + i + 4)
            tracklist.push(track)
          }
        }
      }
      totalBytesRead += bytesRead

      // Report progress every 500ms or when complete
      const now = Date.now()
      if (onProgress && (now - lastProgressUpdate >= 500 || bytesRead < bufferSize)) {
        const percent = fileSize > 0 ? Math.round((totalBytesRead / fileSize) * 100) : 0
        onProgress({
          phase: 'library',
          tracksFound: tracklist.length,
          bytesRead: totalBytesRead,
          totalBytes: fileSize,
          percent
        })
        lastProgressUpdate = now
      }

      if (bytesRead < bufferSize) {
        break // End of file reached
      }
    }
    if (handler) {
      await handler.close()
      console.log('File handler library closed successfully.')
    }
    logDebug('parseItunesDb complete', { tracks: tracklist.length })
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
  return tracklist
}

async function readBytesAtPosition (handler, buffer, position, length) {
  try {
    const { bytesRead } = await handler.read(buffer, 0, length, position)

    return bytesRead
  } catch (error) {
    console.error('Error reading bytes at position:', error)
    throw error
  }
}

async function parseMhit (handler, startOffset) {
  const track = {}
  let bytesOffset = startOffset

  let totalSize = 0

  const dword = Buffer.alloc(4)

  await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const headerSize = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  // Skip 4 bytes
  bytesOffset += 4

  await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const mhodEntriesCount = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const trackIdValue = Number(littleEndianToBigInt(dword))
  track.id = trackIdValue

  bytesOffset += 4

  // skip 20 bytes
  bytesOffset += 20

  await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const trackLengthValue = Number(littleEndianToBigInt(dword))
  track.length = trackLengthValue

  bytesOffset += 4

  for (let i = 0; i < mhodEntriesCount; ++i) {
    totalSize = await parsemhod(track, handler, startOffset, headerSize)
    startOffset += totalSize
  }
  return track
}

async function parsemhod (track, handler, startOffset, headerSize) {
  let bytesOffset = startOffset + headerSize - 4
  const dword = Buffer.alloc(4)

  bytesOffset += 8

  await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const totalSizeValue = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const mhodTypeValue = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  if (mhodTypeValue === 1 || mhodTypeValue === 3 || mhodTypeValue === 4) {
    bytesOffset += 12

    await readBytesAtPosition(handler, dword, bytesOffset, 4)
    const stringLengthValue = Number(littleEndianToBigInt(dword))

    bytesOffset += 12

    const dataArray = Buffer.alloc(stringLengthValue)
    await readBytesAtPosition(
      handler,
      dataArray,
      bytesOffset,
      stringLengthValue
    )

    const stringData = dataArray.toString('utf16le')

    switch (mhodTypeValue) {
      case 1:
        track.track = stringData
        break
      case 3:
        track.album = stringData
        break
      case 4:
        track.artist = stringData
        break
    }
  }
  return totalSizeValue
}

// Function to convert little endian byte array to big endian
function littleEndianToBigInt (byteArray) {
  const bigEndianBytes = Buffer.alloc(byteArray.length)
  for (let i = 0; i < byteArray.length; i++) {
    bigEndianBytes[i] = byteArray[byteArray.length - i - 1]
  }
  return BigInt('0x' + bigEndianBytes.toString('hex'))
}

export async function getRecentTracks (path, onProgress) {
  const iTunesDbPath = path + 'iTunesDB'
  const playCountsPath = path + 'Play Counts'
  const tracklist = await parse(iTunesDbPath, playCountsPath, onProgress)

  const recentPlays = tracklist.filter(
    entry => entry.playCount && entry.playCount > 0
  )
  recentPlays.sort((a, b) => b.lastPlayed - a.lastPlayed)
  logDebug('getRecentTracks', {
    totalTracks: tracklist.length,
    recentPlays: recentPlays.length
  })

  // Final progress update with play counts phase complete
  if (onProgress) {
    onProgress({
      phase: 'complete',
      tracksFound: tracklist.length,
      recentPlays: recentPlays.length,
      percent: 100
    })
  }

  return recentPlays
}

export async function parse (iTunesDbPath, playCountsPath, onProgress) {
  const tracklist = await parseItunesDb(iTunesDbPath, onProgress)

  // Report starting play counts phase
  if (onProgress) {
    onProgress({
      phase: 'playcounts',
      tracksFound: tracklist.length,
      percent: 100
    })
  }

  await parsePlayCounts(playCountsPath, tracklist)
  return tracklist
}
