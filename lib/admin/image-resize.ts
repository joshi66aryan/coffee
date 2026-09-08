'use client'

/**
 * Downscales and re-encodes a product image before it is uploaded.
 *
 * Product photos come off a phone or a supplier's site at full resolution —
 * the catalog currently holds 2400x1830 JPEGs of over a megabyte, displayed in
 * a card about 280px wide. Next.js can resize them for delivery, but only
 * after its optimiser has pulled the whole original out of Supabase Storage
 * first, so an oversized upload is paid for on every cold image request.
 *
 * Doing it in the browser keeps the binary off the server entirely (the upload
 * already goes straight to Storage via a signed URL) and means the expensive
 * version is never stored in the first place.
 */

// Comfortably larger than the biggest slot the catalog renders (a full-width
// detail view on a 3x phone), so downscaling is invisible at every size the
// app actually asks for.
export const MAX_IMAGE_DIMENSION = 1600

export const IMAGE_QUALITY = 0.82

export interface PreparedImage {
  blob: Blob
  /** Carries the encoded format's extension — the upload path is derived from it. */
  filename: string
  contentType: string
}

function replaceExtension(filename: string, extension: string): string {
  const base = filename.replace(/\.[^./\\]+$/, '')
  return `${base || 'image'}.${extension}`
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

function asIs(file: File): PreparedImage {
  return { blob: file, filename: file.name, contentType: file.type || 'image/jpeg' }
}

export async function prepareProductImage(file: File): Promise<PreparedImage> {
  // A browser that can't decode the file here would not have been able to
  // display it either; uploading it untouched keeps the old behaviour rather
  // than failing the whole form.
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return asIs(file)
  }

  const longestEdge = Math.max(bitmap.width, bitmap.height)
  const scale = longestEdge > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestEdge : 1
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return asIs(file)
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Safari silently hands back a PNG when asked for WebP on older versions,
  // which would be far larger than the JPEG we started from.
  let blob = await toBlob(canvas, 'image/webp', IMAGE_QUALITY)
  let contentType = 'image/webp'
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg', IMAGE_QUALITY)
    contentType = 'image/jpeg'
  }

  if (!blob) return asIs(file)

  // Nothing was downscaled and the re-encode didn't help — an image that was
  // already small and well compressed. Keep the original bytes.
  if (scale === 1 && blob.size >= file.size) return asIs(file)

  return {
    blob,
    filename: replaceExtension(file.name, contentType === 'image/webp' ? 'webp' : 'jpg'),
    contentType,
  }
}
