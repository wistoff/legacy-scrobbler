import { open } from 'node:fs/promises'

const debugEnabled = process.env.NODE_ENV !== 'production'
const logDebug = (...args) => {
  if (debugEnabled) {
    console.log('[debug]', ...args)
  }
}

async function readBytesAtPosition (handler, buffer, position, length) {
  const { bytesRead } = await handler.read(buffer, 0, length, position)
  return bytesRead
}

function littleEndianToBigInt (byteArray) {
  const bigEndianBytes = Buffer.alloc(byteArray.length)
  for (let i = 0; i < byteArray.length; i++) {
    bigEndianBytes[i] = byteArray[byteArray.length - i - 1]
  }
  return BigInt('0x' + bigEndianBytes.toString('hex'))
}

export async function parsePlayCounts (filePath, tracklist) {
  let handler
  try {
    console.log('Reading "Play Counts" file:', filePath)
    logDebug('parsePlayCounts start', { filePath })

    handler = await open(filePath, 'r')

    let bytesOffset = 8
    const dword = Buffer.alloc(4)

    await readBytesAtPosition(handler, dword, bytesOffset, 4)
    const entryLen = Number(littleEndianToBigInt(dword))
    bytesOffset += 4

    await readBytesAtPosition(handler, dword, bytesOffset, 4)
    const numEntries = Number(littleEndianToBigInt(dword))
    bytesOffset += 4

    bytesOffset += 80

    const expectedEntries = tracklist.length
    if (numEntries !== expectedEntries && numEntries !== expectedEntries + 1) {
      console.warn(
        `[readDB] Play Counts/iTunesDB mismatch: Play Counts has ${numEntries} entries, iTunesDB has ${expectedEntries} tracks`
      )
      logDebug('parsePlayCounts mismatch', {
        playCountsEntries: numEntries,
        iTunesDbTracks: expectedEntries,
        delta: numEntries - expectedEntries
      })
    }

    let updatedCount = 0
    const entriesToRead = Math.min(numEntries, tracklist.length)
    for (let i = 0; i < entriesToRead; i++) {
      const savedBytes = bytesOffset
      await readBytesAtPosition(handler, dword, bytesOffset, 4)
      const playCount = Number(littleEndianToBigInt(dword))
      bytesOffset += 4

      if (playCount > 0) {
        await readBytesAtPosition(handler, dword, bytesOffset, 4)

        let lastPlayed = Number(littleEndianToBigInt(dword))
        lastPlayed -= 2082844800
        lastPlayed += new Date().getTimezoneOffset() * 60

        tracklist[i].playCount = playCount
        tracklist[i].lastPlayed = lastPlayed
        updatedCount += 1
      }

      bytesOffset = savedBytes + entryLen
    }

    logDebug('parsePlayCounts complete', {
      entries: numEntries,
      tracksInDb: tracklist.length,
      updatedCount
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    if (handler) {
      await handler.close()
      console.log('File handler for play counts closed successfully.')
    }
  }
}
