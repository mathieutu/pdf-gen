import type { ImageUrl } from './types'
import { describe, expect, it } from 'vitest'
import { generatePDF } from './generate'

// PNG 1x1 transparent minimal
const TINY_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=' as ImageUrl

// JPEG 1x1 white minimal
const TINY_JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVIP/2Q==' as ImageUrl

const isValidPdf = (buffer: Uint8Array) => {
  if (buffer.length < 4) return false
  const header = String.fromCharCode(...buffer.slice(0, 4))
  if (header !== '%PDF') return false
  const tail = new TextDecoder().decode(buffer.slice(-20))
  return tail.includes('%%EOF')
}

describe('generatePDF — integration tests (real Puppeteer)', () => {
  it('simple HTML → valid PDF', async () => {
    const result = await generatePDF(['<h1>Hello, World!</h1>' as never])
    expect(isValidPdf(result)).toBe(true)
    expect(result.length).toBeGreaterThan(1000)
  })

  it('HTML with CSS → valid PDF', async () => {
    const result = await generatePDF([
      '<style>body { background: white; color: black; font-family: sans-serif; }</style><p>Styled content</p>' as never,
    ])
    expect(isValidPdf(result)).toBe(true)
  })

  it('multiple HtmlStrings → merged valid PDF', async () => {
    const result = await generatePDF([
      '<p>Page 1</p>' as never,
      '<p>Page 2</p>' as never,
    ])
    expect(isValidPdf(result)).toBe(true)
    expect(result.length).toBeGreaterThan(1000)
  })

  it('PNG image data URL → valid PDF', async () => {
    const result = await generatePDF([TINY_PNG_DATA_URL])
    expect(isValidPdf(result)).toBe(true)
  })

  it('JPEG image data URL → valid PDF', async () => {
    const result = await generatePDF([TINY_JPEG_DATA_URL])
    expect(isValidPdf(result)).toBe(true)
  })

  it('two consecutive images → grouped into single valid PDF', async () => {
    const result = await generatePDF([TINY_PNG_DATA_URL, TINY_JPEG_DATA_URL])
    expect(isValidPdf(result)).toBe(true)
  })

  it('HTML + image data URL → merged valid PDF', async () => {
    const result = await generatePDF([
      '<p>HTML content</p>' as never,
      TINY_PNG_DATA_URL,
    ])
    expect(isValidPdf(result)).toBe(true)
  })

  it('Uint8Array (generated PDF bytes) → re-merged valid PDF', async () => {
    const firstPdf = await generatePDF(['<p>First</p>' as never])
    expect(isValidPdf(firstPdf)).toBe(true)

    const result = await generatePDF([firstPdf])
    expect(isValidPdf(result)).toBe(true)
  })

  it('HTML + Uint8Array PDF → merged valid PDF', async () => {
    const existingPdf = await generatePDF(['<p>Existing document</p>' as never])
    const result = await generatePDF(['<p>New page</p>' as never, existingPdf])
    expect(isValidPdf(result)).toBe(true)
  })

  it('two sequential calls each return independent valid PDF', async () => {
    const first = await generatePDF(['<p>First call</p>' as never])
    const second = await generatePDF(['<p>Second call</p>' as never])
    expect(isValidPdf(first)).toBe(true)
    expect(isValidPdf(second)).toBe(true)
    expect(first).not.toBe(second)
  })
})
