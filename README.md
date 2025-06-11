# HttpStream

HttpStream is a Web Streams API compatible implementation that allows you to load bytes from a remote server on demand. Under the hood it retrieves the bytes via HTTP 206 Range requests.

## Features

- **Web Streams API Compatible** - Implements ReadableStream interface
- **Range Request Support** - Uses HTTP 206 partial content requests for efficient streaming
- **Configurable Chunk Size** - Control memory usage with customizable chunk sizes
- **Error Handling** - Proper HTTP error handling and stream error propagation
- **Backward Compatible** - Maintains original readAsync/getLength API

## API

### Constructor
```typescript
new HttpStream(url: string, options?: { chunkSize?: number })
```

### Stream Methods
- `getReadableStream(): ReadableStream<Uint8Array>` - Returns a standard ReadableStream
- `getReader(): ReadableStreamDefaultReader<Uint8Array>` - Returns a stream reader
- `read(position?, length?): Promise<{value: Uint8Array | undefined, done: boolean}>` - Read chunks or specific ranges
- `pipeTo(destination: WritableStream): Promise<void>` - Pipe to a WritableStream
- `pipeThrough(transform): ReadableStream` - Transform the stream

### Legacy Methods (Backward Compatible)
- `readAsync(position: number, length: number): Promise<ArrayBuffer>` - Read specific byte range
- `getLength(): Promise<number>` - Get total file size

## Quick start

 - Host an HTTP server on the project root directory.
 - Launch your browser and navigate to index.html, then open develop tools to see what is going on.

The demo will show you how to detect pixel size of two images under the `public` folder without downloading them completely, plus demonstrations of the new Stream API features.

## Usage Examples

### Basic Range Reading (Original API)
```typescript
const stream = new HttpStream('/path/to/file.jpg')
const header = await stream.readAsync(0, 30) // Read first 30 bytes
const fileSize = await stream.getLength()
```

### Streaming with Web Streams API
```typescript
const stream = new HttpStream('/path/to/file.jpg', { chunkSize: 8192 })
const reader = stream.getReader()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  // Process chunk
  console.log(`Received ${value.length} bytes`)
}
```

### Piping to Another Stream
```typescript
const httpStream = new HttpStream('/path/to/file.jpg')
const writableStream = new WritableStream({
  write(chunk) {
    // Process each chunk
    console.log(`Processing ${chunk.length} bytes`)
  }
})

await httpStream.pipeTo(writableStream)
```
