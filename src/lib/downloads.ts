export type ZipEntry = {
  name: string
  data: Uint8Array
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(data: Uint8Array): number {
  let value = 0xffffffff
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const encoded = entries.map(entry => ({ ...entry, name: encoder.encode(entry.name), crc: crc32(entry.data) }))
  const localSize = encoded.reduce((size, entry) => size + 30 + entry.name.length + entry.data.length, 0)
  const centralSize = encoded.reduce((size, entry) => size + 46 + entry.name.length, 0)
  const output = new Uint8Array(localSize + centralSize + 22)
  let offset = 0
  const localOffsets: number[] = []

  for (const entry of encoded) {
    localOffsets.push(offset)
    writeUint32(output, offset, 0x04034b50)
    writeUint16(output, offset + 4, 20)
    writeUint16(output, offset + 6, 0x0800)
    writeUint16(output, offset + 8, 0)
    writeUint16(output, offset + 10, 0)
    writeUint16(output, offset + 12, 0)
    writeUint32(output, offset + 14, entry.crc)
    writeUint32(output, offset + 18, entry.data.length)
    writeUint32(output, offset + 22, entry.data.length)
    writeUint16(output, offset + 26, entry.name.length)
    writeUint16(output, offset + 28, 0)
    output.set(entry.name, offset + 30)
    output.set(entry.data, offset + 30 + entry.name.length)
    offset += 30 + entry.name.length + entry.data.length
  }

  const centralOffset = offset
  for (let index = 0; index < encoded.length; index += 1) {
    const entry = encoded[index]
    writeUint32(output, offset, 0x02014b50)
    writeUint16(output, offset + 4, 20)
    writeUint16(output, offset + 6, 20)
    writeUint16(output, offset + 8, 0x0800)
    writeUint16(output, offset + 10, 0)
    writeUint16(output, offset + 12, 0)
    writeUint16(output, offset + 14, 0)
    writeUint32(output, offset + 16, entry.crc)
    writeUint32(output, offset + 20, entry.data.length)
    writeUint32(output, offset + 24, entry.data.length)
    writeUint16(output, offset + 28, entry.name.length)
    writeUint16(output, offset + 30, 0)
    writeUint16(output, offset + 32, 0)
    writeUint16(output, offset + 34, 0)
    writeUint16(output, offset + 36, 0)
    writeUint32(output, offset + 38, 0)
    writeUint32(output, offset + 42, localOffsets[index])
    output.set(entry.name, offset + 46)
    offset += 46 + entry.name.length
  }

  writeUint32(output, offset, 0x06054b50)
  writeUint16(output, offset + 4, 0)
  writeUint16(output, offset + 6, 0)
  writeUint16(output, offset + 8, encoded.length)
  writeUint16(output, offset + 10, encoded.length)
  writeUint32(output, offset + 12, centralSize)
  writeUint32(output, offset + 16, centralOffset)
  writeUint16(output, offset + 20, 0)
  return output
}

export function downloadBlob(blob: Blob, filename: string) {
  const anchor = document.createElement('a')
  const url = URL.createObjectURL(blob)
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function safeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '') || 'ChatGPT export'
}
