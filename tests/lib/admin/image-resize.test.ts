import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prepareProductImage, MAX_IMAGE_DIMENSION } from '@/lib/admin/image-resize'

// jsdom ships no canvas implementation and no createImageBitmap, so both are
// stubbed. What's under test is the decision logic — how far to scale, which
// encoding to keep, and when to give up and upload the original.

interface CanvasStub {
  width: number
  height: number
  drawn: { width: number; height: number } | null
}

let canvasStub: CanvasStub
let encodedTypes: string[]

/** Blob sizes the fake encoder should return, keyed by requested mime type. */
let encoderSizes: Record<string, number | null>
/** Type the fake encoder actually produces, regardless of what was asked for. */
let encoderProduces: Record<string, string>

function makeFile(name: string, size: number, type = 'image/jpeg'): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function stubBitmap(width: number, height: number) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close: vi.fn() })),
  )
}

beforeEach(() => {
  canvasStub = { width: 0, height: 0, drawn: null }
  encodedTypes = []
  encoderSizes = { 'image/webp': 50_000, 'image/jpeg': 70_000 }
  encoderProduces = { 'image/webp': 'image/webp', 'image/jpeg': 'image/jpeg' }

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`)
    return {
      set width(value: number) {
        canvasStub.width = value
      },
      get width() {
        return canvasStub.width
      },
      set height(value: number) {
        canvasStub.height = value
      },
      get height() {
        return canvasStub.height
      },
      getContext: () => ({
        drawImage: (_bitmap: unknown, _x: number, _y: number, width: number, height: number) => {
          canvasStub.drawn = { width, height }
        },
      }),
      toBlob: (callback: (blob: Blob | null) => void, type: string) => {
        encodedTypes.push(type)
        const size = encoderSizes[type]
        if (size === null || size === undefined) {
          callback(null)
          return
        }
        const produced = encoderProduces[type]
        const blob = new Blob(['x'], { type: produced })
        Object.defineProperty(blob, 'size', { value: size })
        callback(blob)
      },
    } as unknown as HTMLElement
  }) as typeof document.createElement)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('prepareProductImage', () => {
  it('downscales an oversized photo to the long-edge limit, preserving aspect ratio', async () => {
    stubBitmap(2400, 1830)

    const result = await prepareProductImage(makeFile('bean.jpg', 1_370_418))

    expect(canvasStub.width).toBe(MAX_IMAGE_DIMENSION)
    expect(canvasStub.height).toBe(Math.round(1830 * (MAX_IMAGE_DIMENSION / 2400)))
    expect(canvasStub.drawn).toEqual({ width: canvasStub.width, height: canvasStub.height })
    expect(result.blob.size).toBe(50_000)
  })

  it('scales on the taller edge for a portrait photo', async () => {
    stubBitmap(1200, 3000)

    await prepareProductImage(makeFile('tall.jpg', 900_000))

    expect(canvasStub.height).toBe(MAX_IMAGE_DIMENSION)
    expect(canvasStub.width).toBe(Math.round(1200 * (MAX_IMAGE_DIMENSION / 3000)))
  })

  it('never upscales an image that is already smaller than the limit', async () => {
    stubBitmap(400, 300)
    encoderSizes['image/webp'] = 5_000

    await prepareProductImage(makeFile('small.jpg', 20_000))

    expect(canvasStub.width).toBe(400)
    expect(canvasStub.height).toBe(300)
  })

  it('prefers WebP and renames the file to match', async () => {
    stubBitmap(2400, 1830)

    const result = await prepareProductImage(makeFile('Bean Photo.jpg', 1_000_000))

    expect(result.contentType).toBe('image/webp')
    expect(result.filename).toBe('Bean Photo.webp')
    expect(encodedTypes[0]).toBe('image/webp')
  })

  // Older Safari hands back a PNG when asked for WebP, which would be larger
  // than the JPEG we started from.
  it('falls back to JPEG when the browser will not encode WebP', async () => {
    stubBitmap(2400, 1830)
    encoderProduces['image/webp'] = 'image/png'

    const result = await prepareProductImage(makeFile('bean.jpg', 1_000_000))

    expect(result.contentType).toBe('image/jpeg')
    expect(result.filename).toBe('bean.jpg')
    expect(encodedTypes).toEqual(['image/webp', 'image/jpeg'])
  })

  it('keeps the original when it is already small and re-encoding gains nothing', async () => {
    stubBitmap(400, 300)
    encoderSizes['image/webp'] = 30_000
    const file = makeFile('tiny.webp', 12_000, 'image/webp')

    const result = await prepareProductImage(file)

    expect(result.blob).toBe(file)
    expect(result.filename).toBe('tiny.webp')
  })

  // A downscale is worth keeping even if the bytes happen not to shrink —
  // the stored dimensions are what the optimiser has to pull down later.
  it('keeps the downscaled version even when the encode is not smaller', async () => {
    stubBitmap(2400, 1830)
    encoderSizes['image/webp'] = 999_999
    const file = makeFile('bean.jpg', 100)

    const result = await prepareProductImage(file)

    expect(result.blob).not.toBe(file)
    expect(canvasStub.width).toBe(MAX_IMAGE_DIMENSION)
  })

  it('uploads the original untouched when the image cannot be decoded', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('unsupported format')
      }),
    )
    const file = makeFile('weird.tiff', 500_000, 'image/tiff')

    const result = await prepareProductImage(file)

    expect(result.blob).toBe(file)
    expect(result.filename).toBe('weird.tiff')
    expect(result.contentType).toBe('image/tiff')
  })

  it('uploads the original when both encodings fail', async () => {
    stubBitmap(2400, 1830)
    encoderSizes = { 'image/webp': null, 'image/jpeg': null }
    const file = makeFile('bean.jpg', 1_000_000)

    const result = await prepareProductImage(file)

    expect(result.blob).toBe(file)
  })
})
