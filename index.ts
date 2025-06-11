interface HttpStreamOptions {
  chunkSize?: number
}

class HttpStream {
  readonly url: string = ''
  private _length: number | null = null
  private readonly chunkSize: number

  readAsync (position: number, length: number): Promise<ArrayBuffer> {
    return fetch(this.url, {
      method: 'GET',
      headers: {
        Range: `bytes=${position}-${position + length - 1}`
      },
      keepalive: true
    }).then(item => {
      if (!item.ok) {
        throw new Error(`HTTP ${item.status}: ${item.statusText}`)
      }
      return item.arrayBuffer()
    })
  }

  async getLength (): Promise<number> {
    if (this._length !== null) {
      return this._length
    }
    
    const response = await fetch(this.url, {
      method: 'HEAD'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const headers = response.headers
    const length = headers.get('Content-Length')
    if (length) {
      this._length = parseInt(length)
      return this._length
    }
    
    throw new Error('Content-Length header not available')
  }

  /**
   * Creates a ReadableStream that reads the HTTP resource in chunks
   */
  getReadableStream (): ReadableStream<Uint8Array> {
    let position = 0
    let totalLength: number | null = null

    return new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          totalLength = await this.getLength()
        } catch (error) {
          controller.error(error)
        }
      },

      pull: async (controller) => {
        try {
          if (totalLength === null) {
            controller.close()
            return
          }

          if (position >= totalLength) {
            controller.close()
            return
          }

          const remainingBytes = totalLength - position
          const bytesToRead = Math.min(this.chunkSize, remainingBytes)
          
          const arrayBuffer = await this.readAsync(position, bytesToRead)
          const chunk = new Uint8Array(arrayBuffer)
          
          controller.enqueue(chunk)
          position += bytesToRead
        } catch (error) {
          controller.error(error)
        }
      },

      cancel: () => {
        // Cleanup if needed
      }
    })
  }

  /**
   * Returns a ReadableStreamDefaultReader for reading the stream
   */
  getReader (): ReadableStreamDefaultReader<Uint8Array> {
    return this.getReadableStream().getReader()
  }

  /**
   * Reads a specific chunk from the stream
   */
  async read (position?: number, length?: number): Promise<{ value: Uint8Array | undefined, done: boolean }> {
    if (position !== undefined && length !== undefined) {
      try {
        const arrayBuffer = await this.readAsync(position, length)
        return { value: new Uint8Array(arrayBuffer), done: false }
      } catch (error) {
        return { value: undefined, done: true }
      }
    }

    // If no position/length specified, use the reader
    const reader = this.getReader()
    const result = await reader.read()
    reader.releaseLock()
    return { value: result.value, done: result.done }
  }

  /**
   * Pipes the HttpStream to a WritableStream
   */
  async pipeTo (destination: WritableStream<Uint8Array>): Promise<void> {
    return this.getReadableStream().pipeTo(destination)
  }

  /**
   * Creates a new stream by applying a transform
   */
  pipeThrough<T> (transform: { writable: WritableStream<Uint8Array>, readable: ReadableStream<T> }): ReadableStream<T> {
    return this.getReadableStream().pipeThrough(transform)
  }

  constructor (url: string, options: HttpStreamOptions = {}) {
    this.url = url
    this.chunkSize = options.chunkSize || 8192 // 8KB default chunk size
  }
}

const sequenceEqual = (a1: ArrayLike<unknown>, a2: ArrayLike<unknown>) => {
  if (a1.length !== a2.length) {
    return false
  }

  for (let i = 0; i < a1.length; i++) {
    const b1 = a1[i]
    const b2 = a2[i]
    if (b1 !== b2) {
      return false
    }
  }

  return true
}

const getPngPixelSize = (fileBytes: Uint8Array): [number, number] => {
  const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10]
  const isEqual = sequenceEqual(PNG_HEADER, fileBytes.slice(0, PNG_HEADER.length))
  if (!isEqual) {
    throw new Error('Not a png file')
  }

  const dataView = new DataView(fileBytes.buffer)
  const width = dataView.getInt16(18, false)
  const height = dataView.getInt16(22, false)
  return [width, height]
}

const getJpgPixelSize = async (fileStream: HttpStream): Promise<[number, number]> => {
  const JPG_HEADER_1 = [255, 216, 255, 224]
  const JPG_HEADER_2 = [255, 216, 255, 225]

  const headerBytes = new Uint8Array(await fileStream.readAsync(0, 4))
  const isEqual = sequenceEqual(JPG_HEADER_1, headerBytes) ||
    sequenceEqual(JPG_HEADER_2, headerBytes)

  if (!isEqual) {
    throw new Error('Not a jpg file')
  }

  let basePosition = 4
  const fileBytes = await fileStream.getLength()
  while (basePosition < fileBytes) {
    const sectionLength = new DataView(await fileStream.readAsync(basePosition, 2)).getUint16(0)
    const next = new DataView(await fileStream.readAsync(basePosition + sectionLength + 1, 1)).getUint8(0)

    if (next === 0xC0 || next === 0xC1 || next === 0xC2) {
      const width = new DataView(
        await fileStream.readAsync(basePosition + sectionLength + 5, 2)
      ).getUint16(0)
      const height = new DataView(
        await fileStream.readAsync(basePosition + sectionLength + 7, 2)
      ).getUint16(0)
      return [width, height]
    }

    basePosition = basePosition + sectionLength + 2
  }

  return [-1, -1]
}

const detectPng = async (pngUrl: string) => {
  const stream = new HttpStream(pngUrl)
  const pngBytes = await stream.readAsync(0, 30)
  const [width, height] = getPngPixelSize(new Uint8Array(pngBytes))
  console.log(`Png Image: ${pngUrl}`)
  console.log(`Pixel size: ${width}x${height}`)

  const totalLength = await stream.getLength()
  console.log('Total file bytes:', totalLength)
  console.log('')
}

const detectJpg = async (jpgUrl: string) => {
  const stream = new HttpStream(jpgUrl)
  const [width, height] = await getJpgPixelSize(stream)
  console.log(`Jpg Image: ${jpgUrl}`)
  console.log(`Pixel size: ${width}x${height}`)

  const totalLength = await stream.getLength()
  console.log('Total file bytes:', totalLength)
  console.log('')
}

// Demonstration of new Stream API features
const demonstrateStreamAPI = async () => {
  console.log('=== HttpStream API Demonstration ===\n')
  
  const streamUrl = '/public/yuki.png'
  const httpStream = new HttpStream(streamUrl, { chunkSize: 1024 }) // 1KB chunks
  
  console.log('1. Reading file length:')
  const length = await httpStream.getLength()
  console.log(`   File size: ${length} bytes\n`)
  
  console.log('2. Reading specific range with readAsync:')
  const headerBytes = await httpStream.readAsync(0, 8)
  console.log(`   First 8 bytes: [${Array.from(new Uint8Array(headerBytes)).join(', ')}]\n`)
  
  console.log('3. Using ReadableStream interface:')
  const reader = httpStream.getReader()
  let bytesRead = 0
  let chunksRead = 0
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      if (value) {
        bytesRead += value.length
        chunksRead++
        
        if (chunksRead <= 3) { // Show first 3 chunks
          console.log(`   Chunk ${chunksRead}: ${value.length} bytes`)
        }
      }
    }
    console.log(`   Total: Read ${bytesRead} bytes in ${chunksRead} chunks\n`)
  } finally {
    reader.releaseLock()
  }
  
  console.log('4. Using read() method:')
  const { value, done } = await httpStream.read(100, 50) // Read 50 bytes from position 100
  if (!done && value) {
    console.log(`   Read 50 bytes from position 100: ${value.length} bytes received\n`)
  }
  
  console.log('5. Streaming to array (simulated):')
  const chunks: Uint8Array[] = []
  const readableStream = httpStream.getReadableStream()
  const streamReader = readableStream.getReader()
  
  let totalStreamBytes = 0
  let streamChunks = 0
  
  try {
    while (true) {
      const { done, value } = await streamReader.read()
      if (done) break
      
      if (value) {
        chunks.push(value)
        totalStreamBytes += value.length
        streamChunks++
        
        // Only read first few chunks for demo
        if (streamChunks >= 5) break
      }
    }
    console.log(`   Collected ${streamChunks} chunks, ${totalStreamBytes} total bytes\n`)
  } finally {
    streamReader.releaseLock()
  }
}

// Testing code below.
// Host an HTTP server and make sure '/public' is accessible.
// We will read a PNG image and a JPEG image and detect their pixel sizes without downloading the entire files.
// For a JPEG/PNG file, downloading the first 30 bytes is sufficient to detect the pixel size.
Promise.all([
  detectPng('/public/yuki.png'),
  detectJpg('/public/shubham-dhage-unsplash.jpg')
]).then(() => {
  // Demonstrate the new Stream API features
  return demonstrateStreamAPI()
}).then(() => {
  console.log('=== All demonstrations completed ===')
}).catch((error) => {
  console.error('Error during demonstration:', error)
})

// Export for module use
if (typeof globalThis !== 'undefined' && (globalThis as any).module?.exports) {
  (globalThis as any).module.exports = { HttpStream }
}

// Export for ES modules and browser globals
if (typeof window !== 'undefined') {
  (window as any).HttpStream = HttpStream
}
