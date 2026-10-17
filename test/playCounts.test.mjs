import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { parsePlayCounts } from '../src/renderer/utils/playCounts.mjs'

const MAC_EPOCH_OFFSET = 2082844800
const ENTRY_LENGTH = 16
const HEADER_LENGTH = 96

async function withPlayCountsFile (entries, entryCount, run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'legacy-scrobbler-test-'))
  const filePath = path.join(directory, 'Play Counts')
  const buffer = Buffer.alloc(HEADER_LENGTH + ENTRY_LENGTH * entryCount)

  buffer.writeUInt32LE(ENTRY_LENGTH, 8)
  buffer.writeUInt32LE(entryCount, 12)

  entries.forEach((entry, index) => {
    const offset = HEADER_LENGTH + ENTRY_LENGTH * index
    buffer.writeUInt32LE(entry.playCount, offset)
    buffer.writeUInt32LE(MAC_EPOCH_OFFSET + entry.lastPlayed, offset + 4)
  })

  await writeFile(filePath, buffer)
  try {
    await run(filePath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('reads the final track when entry and track counts match', async () => {
  const tracks = [{ track: 'First' }, { track: 'Final' }]

  await withPlayCountsFile([
    { playCount: 1, lastPlayed: 1000 },
    { playCount: 2, lastPlayed: 2000 }
  ], 2, async filePath => {
    await parsePlayCounts(filePath, tracks)
  })

  assert.equal(tracks[0].playCount, 1)
  assert.equal(tracks[1].playCount, 2)
})

test('ignores a trailing sentinel entry', async () => {
  const tracks = [{ track: 'First' }, { track: 'Final' }]

  await withPlayCountsFile([
    { playCount: 1, lastPlayed: 1000 },
    { playCount: 2, lastPlayed: 2000 },
    { playCount: 99, lastPlayed: 3000 }
  ], 3, async filePath => {
    await parsePlayCounts(filePath, tracks)
  })

  assert.deepEqual(tracks.map(track => track.playCount), [1, 2])
})

test('reads all available entries when Play Counts has fewer entries', async () => {
  const tracks = [{ track: 'First' }, { track: 'Missing' }]

  await withPlayCountsFile([
    { playCount: 3, lastPlayed: 1000 }
  ], 1, async filePath => {
    await parsePlayCounts(filePath, tracks)
  })

  assert.equal(tracks[0].playCount, 3)
  assert.equal(tracks[1].playCount, undefined)
})
