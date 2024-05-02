const { open } = require('fs/promises')

async function parseItunesDb (filePath) {
  let tracklist = []
  try {
    console.log('Reading iTunesDB file:', filePath)
    const handler = await open(filePath, 'r')

    let totalBytesRead = 0

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
      if (bytesRead < bufferSize) {
        break // End of file reached
      }
    }
    if (handler) {
      await handler.close()
      console.log('File handler library closed successfully.')
    }
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

  const readHeaderSize = await readBytesAtPosition(
    handler,
    dword,
    bytesOffset,
    4
  )
  const headerSize = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  // Skip 4 bytes
  bytesOffset += 4

  const mhodEntries = await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const mhodEntriesCount = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  const trackId = await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const trackIdValue = Number(littleEndianToBigInt(dword))
  track.id = trackIdValue

  bytesOffset += 4

  // skip 20 bytes
  bytesOffset += 20

  const trackLength = await readBytesAtPosition(handler, dword, bytesOffset, 4)
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

  const totalSize = await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const totalSizeValue = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  const mhodType = await readBytesAtPosition(handler, dword, bytesOffset, 4)
  const mhodTypeValue = Number(littleEndianToBigInt(dword))

  bytesOffset += 4

  if (mhodTypeValue == 1 || mhodTypeValue == 3 || mhodTypeValue == 4) {
    bytesOffset += 12

    const stringLength = await readBytesAtPosition(
      handler,
      dword,
      bytesOffset,
      4
    )
    const stringLengthValue = Number(littleEndianToBigInt(dword))

    bytesOffset += 12

    const dataArray = Buffer.alloc(stringLengthValue)
    const data = await readBytesAtPosition(
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
  let bigEndianBytes = Buffer.alloc(byteArray.length)
  for (let i = 0; i < byteArray.length; i++) {
    bigEndianBytes[i] = byteArray[byteArray.length - i - 1]
  }
  return BigInt('0x' + bigEndianBytes.toString('hex'))
}

async function parsePlayCounts (filePath, tracklist) {
  try {
    console.log('Reading "Play Counts" file:', filePath)

    const handler = await open(filePath, 'r')

    let bytesOffset = 0

    bytesOffset += 8 // Skip 8 bytes
    const dword = Buffer.alloc(4)

    const entryLenArray = await readBytesAtPosition(
      handler,
      dword,
      bytesOffset,
      4
    )
    const entryLen = Number(littleEndianToBigInt(dword))

    bytesOffset += 4

    const numEntriesArray = await readBytesAtPosition(
      handler,
      dword,
      bytesOffset,
      4
    )
    const numEntries = Number(littleEndianToBigInt(dword))

    bytesOffset += 4

    bytesOffset += 80

    for (let i = 0; i < numEntries - 1; i++) {
      let lastPlayedCollection = []
      let savedBytes = bytesOffset
      const playCountArray = await readBytesAtPosition(
        handler,
        dword,
        bytesOffset,
        4
      )
      const playCount = Number(littleEndianToBigInt(dword))
      bytesOffset += 4

      if (playCount > 0) {
        const lastPlayedArray = await readBytesAtPosition(
          handler,
          dword,
          bytesOffset,
          4
        )

        let lastPlayed = Number(littleEndianToBigInt(dword))
        bytesOffset += 4

        lastPlayed -= 2082844800

        var offset = new Date().getTimezoneOffset() * 60
        lastPlayed += offset

        tracklist[i].playCount = playCount
        tracklist[i].lastPlayed = lastPlayed
      }

      bytesOffset = savedBytes + entryLen
    }
    if (handler) {
      await handler.close()
      console.log('File handler for play counts closed successfully.')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

export async function getRecentTracks (path) {
  const iTunesDbPath = path + 'iTunesDB'
  const playCountsPath = path + 'Play Counts'
  const tracklist = await parse(iTunesDbPath, playCountsPath)

  const recentPlays = tracklist.filter(
    entry => entry.playCount && entry.playCount > 0
  )
  recentPlays.sort((a, b) => b.lastPlayed - a.lastPlayed)
  return recentPlays
}

export async function parse (iTunesDbPath, playCountsPath) {
  const tracklist = await parseItunesDb(iTunesDbPath)
  await parsePlayCounts(playCountsPath, tracklist)
  return tracklist
}
