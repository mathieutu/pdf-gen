import type { ImageUrl } from './types'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import { EXAMPLE_FOOTER_TEMPLATE, EXAMPLE_HEADER_TEMPLATE, EXAMPLE_HTML, EXAMPLE_HTML_URL, EXAMPLE_IMAGE_URL, EXAMPLE_MARGIN, EXAMPLE_PDF_URL } from '@/lib/examples'
import { cssLengthToPoints, generatePDF } from './generate'

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

const extractPageText = async (pdfBuffer: Uint8Array, pageNumber: number): Promise<string> => {
  // pdfjs-dist rejects Node's Buffer (a Uint8Array subclass) — it requires
  // the exact Uint8Array class, since it structuredClone()s the data to a
  // worker-like message handler.
  const doc = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise
  const page = await doc.getPage(pageNumber)
  const content = await page.getTextContent()
  return content.items
    .map(item => 'str' in item ? item.str : '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('generatePDF — pdfOptions header/footer/margin (real Puppeteer + pdfjs-dist)', () => {
  it('single HTML item → footer template text is rendered on the page', async () => {
    const result = await generatePDF(['<h1>Hello</h1>' as never], {
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center;">Acme Corp Footer</div>',
      margin: { bottom: '20mm' },
    })

    const text = await extractPageText(result, 1)
    expect(text).toContain('Acme Corp Footer')
  })

  it('multi-item merge with pageNumber/totalPages → correct numbering on every page (two-pass overlay)', async () => {
    const footerTemplate = '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    const result = await generatePDF([
      '<p>First document</p>' as never,
      '<p>Second document</p>' as never,
    ], { footerTemplate, margin: { bottom: '20mm' } })

    const firstPageText = await extractPageText(result, 1)
    const secondPageText = await extractPageText(result, 2)

    expect(firstPageText).toContain('Page 1 / 2')
    expect(secondPageText).toContain('Page 2 / 2')
  })

  it('multi-item merge with a passthrough PDF + pageNumber/totalPages → the passthrough page\'s MediaBox grows by the margin (two-pass overlay)', async () => {
    const originalPdf = await generatePDF(['<p>Original document</p>' as never])
    const originalDoc = await getDocument({ data: new Uint8Array(originalPdf) }).promise
    const originalPage = await originalDoc.getPage(1)
    const [ox0, oy0, ox1, oy1] = originalPage.view
    const originalWidth = ox1 - ox0
    const originalHeight = oy1 - oy0

    const footerTemplate = '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    const result = await generatePDF([
      '<p>First document</p>' as never,
      originalPdf,
      '<p>Third document</p>' as never,
    ], { margin: EXAMPLE_MARGIN, footerTemplate })

    const mergedDoc = await getDocument({ data: new Uint8Array(result) }).promise
    const passthroughPage = await mergedDoc.getPage(2)
    const [x0, y0, x1, y1] = passthroughPage.view
    const paddedWidth = x1 - x0
    const paddedHeight = y1 - y0

    const leftPt = cssLengthToPoints(EXAMPLE_MARGIN.left)
    const rightPt = cssLengthToPoints(EXAMPLE_MARGIN.right)
    const topPt = cssLengthToPoints(EXAMPLE_MARGIN.top)
    const bottomPt = cssLengthToPoints(EXAMPLE_MARGIN.bottom)

    expect(paddedWidth).toBeCloseTo(originalWidth + leftPt + rightPt, 0)
    expect(paddedHeight).toBeCloseTo(originalHeight + topPt + bottomPt, 0)
  })
})

describe('generatePDF — example.pdf (real Puppeteer)', () => {
  // Uses the same items and pdfOptions as the Playground's default example
  // (and the README's curl example / CURL_CODE) — one shared source of truth.
  // Regenerated on every integration test run so it stays in sync with the
  // code. It is committed to the repo (not gitignored) so a rendering change
  // shows up as a reviewable diff in the PR — review it visually, there is no
  // byte-for-byte assertion here (Puppeteer's PDF output isn't guaranteed
  // deterministic byte-for-byte across runs, e.g. EXAMPLE_HTML's Tailwind CDN
  // script renders asynchronously).
  it('generates example.pdf at the repo root', async () => {
    const pdf = await generatePDF([
      EXAMPLE_HTML as never,
      EXAMPLE_HTML_URL as never,
      EXAMPLE_IMAGE_URL as never,
      EXAMPLE_PDF_URL as never,
    ], {
      margin: EXAMPLE_MARGIN,
      headerTemplate: EXAMPLE_HEADER_TEMPLATE,
      footerTemplate: EXAMPLE_FOOTER_TEMPLATE,
    })

    expect(isValidPdf(pdf)).toBe(true)

    writeFileSync(join(process.cwd(), 'example.pdf'), pdf)
  })
})
