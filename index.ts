class HttpStream {
  readonly url: string = ''

  readAsync (position: number, length: number): Promise<ArrayBuffer> {
    return fetch(this.url, {
      method: 'GET',
      headers: {
        Range: `bytes=${position}-${position + length - 1}`
      },
      keepalive: true
    }).then(item => item.arrayBuffer())
  }

  async getLength (): Promise<number> {
    const response = await fetch(this.url, {
      method: 'HEAD'
    })
    const headers = response.headers
    const length = headers.get('Content-Length')
    if (length) {
      return parseInt(length)
    }
    return 0
  }

  constructor (url: string) {
    this.url = url
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

// Testing codes below.
// Host a http server and make sure the '/public' is accessable.
// We are going to read a png image and a jpg image then detect their pixel size without downloaing the whole files.
// For a jpg/png file, it is enough to download the first 30 bytes to detect the pixel size.
Promise.all([
  detectPng('/public/yuki.png'),
  detectJpg('/public/shubham-dhage-unsplash.jpg')
])
