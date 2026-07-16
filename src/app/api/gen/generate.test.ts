import type { ImageUrl, PdfUrl } from './types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { A4_SIZE, createPDFs, cssLengthToPoints, fetchPdfBytes, fitPassthroughPageToA4, generatePDF, getBrowserLaunchOptions, groupConsecutiveImages, mergePdfs, needsGlobalPageNumbering, padPdfPageMargins } from './generate'
import { HttpError } from './types'

const mocks = vi.hoisted(() => {
  const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46])
  const mockPdf = vi.fn().mockResolvedValue(PDF_BYTES)
  const mockAddStyleTag = vi.fn().mockResolvedValue(undefined)
  const mockGoto = vi.fn().mockResolvedValue(undefined)
  const mockSetContent = vi.fn().mockResolvedValue(undefined)
  const mockPage = { goto: mockGoto, setContent: mockSetContent, addStyleTag: mockAddStyleTag, pdf: mockPdf }
  const mockClose = vi.fn().mockResolvedValue(undefined)
  const mockNewPage = vi.fn().mockResolvedValue(mockPage)
  const mockBrowser = { newPage: mockNewPage, close: mockClose }
  const mockLaunch = vi.fn().mockResolvedValue(mockBrowser)
  const mockPuppeteerExecutablePath = vi.fn().mockResolvedValue('/fake/chromium')

  let chromiumGraphicsMode = true
  const mockChromiumExecutablePath = vi.fn().mockResolvedValue('/fake/chromium-serverless')
  const chromiumModule = {
    get setGraphicsMode() {
      return chromiumGraphicsMode
    },
    set setGraphicsMode(value: boolean) {
      chromiumGraphicsMode = value
    },
    args: ['--disable-gpu'],
    executablePath: mockChromiumExecutablePath,
  }

  const mockDrawPage = vi.fn()
  const mockEmbedPage = vi.fn().mockResolvedValue('embedded-page')
  const mockSave = vi.fn().mockResolvedValue(PDF_BYTES)
  const mockPDFDocumentLoad = vi.fn()
  const mockCopyPages = vi.fn()
  const mockAddPage = vi.fn()
  const mockPDFDocumentCreate = vi.fn()
  const mockSetMediaBox = vi.fn()
  const mockSetCropBox = vi.fn()
  const mockScale = vi.fn()

  return {
    PDF_BYTES,
    mockLaunch,
    mockPuppeteerExecutablePath,
    mockPage,
    mockClose,
    mockNewPage,
    mockGoto,
    mockSetContent,
    mockAddStyleTag,
    mockPdf,
    chromiumModule,
    mockChromiumExecutablePath,
    mockDrawPage,
    mockEmbedPage,
    mockSave,
    mockPDFDocumentLoad,
    mockCopyPages,
    mockAddPage,
    mockPDFDocumentCreate,
    mockSetMediaBox,
    mockSetCropBox,
    mockScale,
    getChromiumGraphicsMode: () => chromiumGraphicsMode,
    resetChromiumGraphicsMode: () => {
      chromiumGraphicsMode = true
    },
  }
})

const FAKE_PDF = mocks.PDF_BYTES

const makeFakePage = (width = 595, height = 842) => ({
  getSize: () => ({ width, height }),
  drawPage: mocks.mockDrawPage,
  getMediaBox: () => ({ x: 0, y: 0, width, height }),
  setMediaBox: mocks.mockSetMediaBox,
  setCropBox: mocks.mockSetCropBox,
  scale: mocks.mockScale,
})

const makeFakeDoc = (pageCount = 1) => ({
  getPageIndices: () => Array.from({ length: pageCount }, (_, index) => index),
  getPageCount: () => pageCount,
  getPages: () => Array.from({ length: pageCount }, () => makeFakePage()),
  embedPage: mocks.mockEmbedPage,
  save: mocks.mockSave,
})

vi.mock('puppeteer-core', () => ({ default: { launch: mocks.mockLaunch } }))
vi.mock('puppeteer', () => ({ executablePath: mocks.mockPuppeteerExecutablePath }))
vi.mock('@sparticuz/chromium', () => ({ default: mocks.chromiumModule }))
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: mocks.mockPDFDocumentLoad,
    create: mocks.mockPDFDocumentCreate,
  },
}))

describe('groupConsecutiveImages', () => {
  it('empty array → empty array', () => {
    expect(groupConsecutiveImages([])).toEqual([])
  })

  it('single image → array with one group of one image', () => {
    expect(groupConsecutiveImages(['img.png' as ImageUrl])).toEqual([['img.png']])
  })

  it('2 consecutive images → single group', () => {
    expect(groupConsecutiveImages(['a.png' as ImageUrl, 'b.jpg' as ImageUrl])).toEqual([['a.png', 'b.jpg']])
  })

  it('3 consecutive images → single group', () => {
    expect(groupConsecutiveImages(['a.png' as ImageUrl, 'b.jpg' as ImageUrl, 'c.gif' as ImageUrl])).toEqual([['a.png', 'b.jpg', 'c.gif']])
  })

  it('image then non-image', () => {
    expect(groupConsecutiveImages(['a.png' as ImageUrl, 'https://example.com' as never])).toEqual([['a.png'], 'https://example.com'])
  })

  it('non-image then image', () => {
    expect(groupConsecutiveImages(['https://example.com' as never, 'a.png' as ImageUrl])).toEqual(['https://example.com', ['a.png']])
  })

  it('image group, html, image group', () => {
    const items = ['a.png' as ImageUrl, 'b.png' as ImageUrl, '<p>hi</p>' as never, 'c.png' as ImageUrl]
    expect(groupConsecutiveImages(items)).toEqual([['a.png', 'b.png'], '<p>hi</p>', ['c.png']])
  })

  it('Uint8Array between two image groups', () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const items = ['a.png' as ImageUrl, pdf, 'b.png' as ImageUrl]
    expect(groupConsecutiveImages(items)).toEqual([['a.png'], pdf, ['b.png']])
  })

  it('HtmlUrl (non-image, non-Uint8Array) stays alone', () => {
    expect(groupConsecutiveImages(['https://example.com' as never])).toEqual(['https://example.com'])
  })

  it('data:image/ is recognized as image', () => {
    expect(groupConsecutiveImages(['data:image/png;base64,abc' as ImageUrl])).toEqual([['data:image/png;base64,abc']])
  })

  it('.pdf URL is not an image', () => {
    expect(groupConsecutiveImages(['doc.pdf' as PdfUrl])).toEqual(['doc.pdf'])
  })

  it('Uint8Array alone → stays alone', () => {
    const pdf = new Uint8Array([1, 2, 3])
    expect(groupConsecutiveImages([pdf])).toEqual([pdf])
  })

  it('does not mutate original array', () => {
    const items = ['a.png' as ImageUrl, 'b.jpg' as ImageUrl]
    const original = [...items]
    groupConsecutiveImages(items)
    expect(items).toEqual(original)
  })
})

describe('createPDFs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('routes HTML/url groups through injected converter, fetches PdfUrl groups, and keeps existing Uint8Array PDFs untouched', async () => {
    const convertedImageGroup = new Uint8Array([1])
    const convertedHtml = new Uint8Array([2])
    const convertedUrl = new Uint8Array([3])
    const existingPdfBytes = new Uint8Array([9, 9])
    const fetchedPdfBytes = new Uint8Array([4, 4])

    const convertHtml = vi.fn()
      .mockResolvedValueOnce(convertedImageGroup)
      .mockResolvedValueOnce(convertedHtml)
      .mockResolvedValueOnce(convertedUrl)

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => fetchedPdfBytes.buffer })
    vi.stubGlobal('fetch', mockFetch)

    const result = await createPDFs([
      ['a.png', 'b.jpg'],
      '<p>inline html</p>',
      'https://example.com/page',
      'doc.pdf',
      existingPdfBytes,
    ], undefined, convertHtml)

    expect(convertHtml).toHaveBeenCalledTimes(3)
    expect(convertHtml).toHaveBeenNthCalledWith(1, {
      html: expect.stringContaining('<img src="a.png" alt=""'),
    })
    expect(convertHtml).toHaveBeenNthCalledWith(2, { html: '<p>inline html</p>' })
    expect(convertHtml).toHaveBeenNthCalledWith(3, { url: 'https://example.com/page' })
    expect(mockFetch).toHaveBeenCalledWith('doc.pdf')
    expect(result).toEqual([convertedImageGroup, convertedHtml, convertedUrl, fetchedPdfBytes, existingPdfBytes])
    expect(mocks.mockLaunch).not.toHaveBeenCalled()
  })

  it('PdfUrl group → fetch always called, even when padPassthroughMargins is false/omitted', async () => {
    const fetchedPdfBytes = new Uint8Array([4, 4])
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => fetchedPdfBytes.buffer })
    vi.stubGlobal('fetch', mockFetch)

    const result = await createPDFs(['doc.pdf'], undefined, vi.fn())

    expect(mockFetch).toHaveBeenCalledWith('doc.pdf')
    expect(result).toEqual([fetchedPdfBytes])
  })

  it('padPassthroughMargins omitted/false (default) → bytes come out unchanged, no padPdfPageMargins involved', async () => {
    const existingPdfBytes = new Uint8Array([9, 9])

    const result = await createPDFs([existingPdfBytes], undefined, vi.fn())

    expect(result).toEqual([existingPdfBytes])
    expect(mocks.mockPDFDocumentLoad).not.toHaveBeenCalled()
  })

  it('padPassthroughMargins: true + Uint8Array group → padPdfPageMargins applied directly, no fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    const fakeDoc = { getPages: () => [], save: vi.fn().mockResolvedValue(new Uint8Array([5])) }
    mocks.mockPDFDocumentLoad.mockReset().mockResolvedValue(fakeDoc)

    const existingPdfBytes = new Uint8Array([9, 9])
    const result = await createPDFs([existingPdfBytes], { margin: { top: '10px' } }, vi.fn(), true)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledWith(existingPdfBytes)
    expect(result).not.toEqual([existingPdfBytes])
  })

  it('padPassthroughMargins: true + PdfUrl group → fetch then padPdfPageMargins applied on the result', async () => {
    const fetchedPdfBytes = new Uint8Array([4, 4])
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => fetchedPdfBytes.buffer })
    vi.stubGlobal('fetch', mockFetch)
    const fakeDoc = { getPages: () => [], save: vi.fn().mockResolvedValue(new Uint8Array([5])) }
    mocks.mockPDFDocumentLoad.mockReset().mockResolvedValue(fakeDoc)

    await createPDFs(['doc.pdf'], { margin: { top: '10px' } }, vi.fn(), true)

    expect(mockFetch).toHaveBeenCalledWith('doc.pdf')
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledWith(fetchedPdfBytes)
  })
})

describe('mergePdfs', () => {
  beforeEach(() => {
    mocks.mockPDFDocumentCreate.mockReset()
    mocks.mockPDFDocumentLoad.mockReset()
    mocks.mockCopyPages.mockReset()
    mocks.mockAddPage.mockReset()
    mocks.mockSave.mockReset()
  })

  it('calls PDFDocument.create() once, PDFDocument.load() once per input PDF in order, copyPages/addPage for each, and returns save() result', async () => {
    const mergedDoc = { copyPages: mocks.mockCopyPages, addPage: mocks.mockAddPage, save: mocks.mockSave }
    mocks.mockPDFDocumentCreate.mockResolvedValue(mergedDoc)
    const doc1 = { getPageIndices: () => [0] }
    const doc2 = { getPageIndices: () => [0, 1] }
    mocks.mockPDFDocumentLoad
      .mockResolvedValueOnce(doc1)
      .mockResolvedValueOnce(doc2)
    mocks.mockCopyPages
      .mockResolvedValueOnce(['page-a'])
      .mockResolvedValueOnce(['page-b', 'page-c'])
    const savedBytes = new Uint8Array([1, 2, 3])
    mocks.mockSave.mockResolvedValue(savedBytes)

    const pdf1 = new Uint8Array([1])
    const pdf2 = new Uint8Array([2])
    const result = await mergePdfs([pdf1, pdf2])

    expect(mocks.mockPDFDocumentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.mockPDFDocumentLoad).toHaveBeenNthCalledWith(1, pdf1)
    expect(mocks.mockPDFDocumentLoad).toHaveBeenNthCalledWith(2, pdf2)
    expect(mocks.mockCopyPages).toHaveBeenNthCalledWith(1, doc1, [0])
    expect(mocks.mockCopyPages).toHaveBeenNthCalledWith(2, doc2, [0, 1])
    expect(mocks.mockAddPage).toHaveBeenCalledTimes(3)
    expect(mocks.mockAddPage).toHaveBeenNthCalledWith(1, 'page-a')
    expect(mocks.mockAddPage).toHaveBeenNthCalledWith(2, 'page-b')
    expect(mocks.mockAddPage).toHaveBeenNthCalledWith(3, 'page-c')
    expect(mocks.mockSave).toHaveBeenCalledWith({ useObjectStreams: false })
    expect(result).toBe(savedBytes)
  })
})

describe('fetchPdfBytes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetch called with the URL, returns a Uint8Array of the content', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes.buffer })
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchPdfBytes('https://example.com/doc.pdf')

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/doc.pdf')
    expect(result).toEqual(bytes)
  })

  it('ok: false → rejects with HttpError(502)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', mockFetch)

    await expect(fetchPdfBytes('https://example.com/doc.pdf')).rejects.toThrow(HttpError)
    await expect(fetchPdfBytes('https://example.com/doc.pdf')).rejects.toMatchObject({ status: 502 })
  })
})

describe('cssLengthToPoints', () => {
  it.each([
    ['20mm', 56.7],
    ['1in', 72],
    ['96px', 72],
    ['96', 72],
    [undefined, 0],
  ])('%s → %s', (value, expected) => {
    expect(cssLengthToPoints(value)).toBeCloseTo(expected)
  })
})

describe('fitPassthroughPageToA4', () => {
  it('no margin, page exactly 2x A4 size → scaled by a clean 0.5 factor, centered offset is zero', () => {
    const mockSetMediaBox = vi.fn()
    const mockSetCropBox = vi.fn()
    const mockScale = vi.fn()
    const page = {
      getMediaBox: () => ({ x: 0, y: 0, width: A4_SIZE.width * 2, height: A4_SIZE.height * 2 }),
      setMediaBox: mockSetMediaBox,
      setCropBox: mockSetCropBox,
      scale: mockScale,
    }

    fitPassthroughPageToA4(page as never, undefined)

    expect(mockScale).toHaveBeenCalledWith(0.5, 0.5)
    // Scaled page (0.5x) exactly fills the full A4 canvas (no margin reserved),
    // so it's already sitting flush at (0, 0) — no centering offset needed.
    expect(mockSetMediaBox).toHaveBeenCalledWith(0, 0, A4_SIZE.width, A4_SIZE.height)
    expect(mockSetCropBox).toHaveBeenCalledWith(0, 0, A4_SIZE.width, A4_SIZE.height)
  })

  it('non-zero uniform margin → page scaled to fit the content area and offset by margin + centering', () => {
    const mockSetMediaBox = vi.fn()
    const mockSetCropBox = vi.fn()
    const mockScale = vi.fn()
    const width = 595
    const height = 842
    const page = {
      getMediaBox: () => ({ x: 0, y: 0, width, height }),
      setMediaBox: mockSetMediaBox,
      setCropBox: mockSetCropBox,
      scale: mockScale,
    }
    const margin = { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }

    fitPassthroughPageToA4(page as never, margin)

    const marginPt = cssLengthToPoints('10mm')
    const contentWidth = A4_SIZE.width - 2 * marginPt
    const contentHeight = A4_SIZE.height - 2 * marginPt
    const factor = Math.min(contentWidth / width, contentHeight / height)
    const offsetX = marginPt + (contentWidth - width * factor) / 2
    const offsetY = marginPt + (contentHeight - height * factor) / 2

    expect(mockScale).toHaveBeenCalledWith(factor, factor)
    expect(mockSetMediaBox).toHaveBeenCalledWith(-offsetX, -offsetY, A4_SIZE.width, A4_SIZE.height)
    expect(mockSetCropBox).toHaveBeenCalledWith(-offsetX, -offsetY, A4_SIZE.width, A4_SIZE.height)
  })

  it('landscape page far from the A4 aspect ratio → uniform factor still produces an exact A4-sized box', () => {
    const mockSetMediaBox = vi.fn()
    const page = {
      getMediaBox: () => ({ x: 0, y: 0, width: 2000, height: 100 }),
      setMediaBox: mockSetMediaBox,
      setCropBox: vi.fn(),
      scale: vi.fn(),
    }

    fitPassthroughPageToA4(page as never, undefined)

    const [, , boxWidth, boxHeight] = mockSetMediaBox.mock.calls[0]
    expect(boxWidth).toBe(A4_SIZE.width)
    expect(boxHeight).toBe(A4_SIZE.height)
  })
})

describe('padPdfPageMargins', () => {
  beforeEach(() => {
    mocks.mockPDFDocumentLoad.mockReset()
  })

  it('all margins 0/absent → still loads and scales pages to A4 (size normalization applies regardless of margin)', async () => {
    const mockSetMediaBox = vi.fn()
    const mockScale = vi.fn()
    const page = {
      getMediaBox: () => ({ x: 0, y: 0, width: A4_SIZE.width * 2, height: A4_SIZE.height * 2 }),
      setMediaBox: mockSetMediaBox,
      setCropBox: vi.fn(),
      scale: mockScale,
    }
    const savedBytes = new Uint8Array([9])
    mocks.mockPDFDocumentLoad.mockResolvedValue({ getPages: () => [page], save: vi.fn().mockResolvedValue(savedBytes) })

    const result = await padPdfPageMargins(new Uint8Array([1]), undefined)

    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalled()
    expect(mockScale).toHaveBeenCalledWith(0.5, 0.5)
    expect(result).toBe(savedBytes)
  })

  it('several pages of different sizes in the same document → each page is scaled/boxed from its own getMediaBox()', async () => {
    const mockScaleA = vi.fn()
    const mockScaleB = vi.fn()
    const mockSetMediaBoxA = vi.fn()
    const mockSetMediaBoxB = vi.fn()
    const pageA = { getMediaBox: () => ({ x: 0, y: 0, width: 595, height: 842 }), setMediaBox: mockSetMediaBoxA, setCropBox: vi.fn(), scale: mockScaleA }
    const pageB = { getMediaBox: () => ({ x: 0, y: 0, width: 842, height: 595 }), setMediaBox: mockSetMediaBoxB, setCropBox: vi.fn(), scale: mockScaleB }
    mocks.mockPDFDocumentLoad.mockResolvedValue({
      getPages: () => [pageA, pageB],
      save: vi.fn().mockResolvedValue(new Uint8Array()),
    })

    await padPdfPageMargins(new Uint8Array([1]), { top: '10mm' })

    // Each page's scale factor is computed from its own (different) width/height,
    // not a single value shared/reused across the whole document.
    expect(mockScaleA).toHaveBeenCalled()
    expect(mockScaleB).toHaveBeenCalled()
    expect(mockScaleA.mock.calls[0]).not.toEqual(mockScaleB.mock.calls[0])
    expect(mockSetMediaBoxA).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), A4_SIZE.width, A4_SIZE.height)
    expect(mockSetMediaBoxB).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), A4_SIZE.width, A4_SIZE.height)
  })
})

describe('generatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL', undefined)
    vi.stubEnv('CI', undefined)
    mocks.mockPdf.mockResolvedValue(FAKE_PDF)
    mocks.mockPDFDocumentCreate.mockReset().mockResolvedValue({
      copyPages: mocks.mockCopyPages,
      addPage: mocks.mockAddPage,
      save: mocks.mockSave,
    })
    mocks.mockCopyPages.mockReset().mockResolvedValue(['copied-page'])
    mocks.mockAddPage.mockReset()
    mocks.mockPDFDocumentLoad.mockReset().mockResolvedValue(makeFakeDoc())
    mocks.mockEmbedPage.mockReset().mockResolvedValue('embedded-page')
    mocks.mockDrawPage.mockReset()
    mocks.mockSetMediaBox.mockReset()
    mocks.mockSetCropBox.mockReset()
    mocks.mockScale.mockReset()
    mocks.mockSave.mockReset().mockResolvedValue(FAKE_PDF)
    mocks.resetChromiumGraphicsMode()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('local env → uses puppeteer executablePath only, sandbox kept enabled', async () => {
    const options = await getBrowserLaunchOptions()

    expect(options).toEqual({ executablePath: '/fake/chromium' })
    expect(mocks.mockPuppeteerExecutablePath).toHaveBeenCalledTimes(1)
    expect(mocks.mockChromiumExecutablePath).not.toHaveBeenCalled()
    expect(mocks.getChromiumGraphicsMode()).toBe(false)
  })

  it('CI env → uses puppeteer executablePath and disables sandbox', async () => {
    vi.stubEnv('CI', 'true')

    const options = await getBrowserLaunchOptions()

    expect(options).toEqual({
      executablePath: '/fake/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--hide-scrollbars'],
    })
    expect(mocks.mockPuppeteerExecutablePath).toHaveBeenCalledTimes(1)
    expect(mocks.mockChromiumExecutablePath).not.toHaveBeenCalled()
    expect(mocks.getChromiumGraphicsMode()).toBe(false)
  })

  it('serverless production env → uses chromium executablePath and args', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL', '1')

    const options = await getBrowserLaunchOptions()

    expect(options).toEqual({
      args: [
        '--disable-gpu',
        '--font-render-hinting=none',
        '--hide-scrollbars',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      executablePath: '/fake/chromium-serverless',
    })
    expect(mocks.mockChromiumExecutablePath).toHaveBeenCalledTimes(1)
    expect(mocks.mockPuppeteerExecutablePath).not.toHaveBeenCalled()
    expect(mocks.getChromiumGraphicsMode()).toBe(false)
  })

  it('HtmlString → setContent called with exact HTML', async () => {
    await generatePDF(['<p>hello</p>' as never])
    expect(mocks.mockSetContent).toHaveBeenCalledWith('<p>hello</p>', { waitUntil: 'load' })
  })

  it('HtmlString → addStyleTag called with white background', async () => {
    await generatePDF(['<p>hello</p>' as never])
    expect(mocks.mockAddStyleTag).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('background: white'),
    }))
  })

  it('HtmlString → page.pdf() called with correct options', async () => {
    await generatePDF(['<p>hello</p>' as never])
    expect(mocks.mockPdf).toHaveBeenCalledWith({
      preferCSSPageSize: true,
      printBackground: true,
      format: 'a4',
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
  })

  it('HtmlString → browser.close() called', async () => {
    await generatePDF(['<p>hello</p>' as never])
    expect(mocks.mockClose).toHaveBeenCalled()
  })

  it('PdfUrl → launch NOT called; fetch called with the URL, fetched bytes passed on to the merge', async () => {
    const fetchedBytes = new Uint8Array([1, 2, 3])
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => fetchedBytes.buffer })
    vi.stubGlobal('fetch', mockFetch)

    await generatePDF(['doc.pdf' as PdfUrl])

    expect(mocks.mockLaunch).not.toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith('doc.pdf')
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledWith(fetchedBytes)
  })

  it('Uint8Array → launch NOT called; PDFDocument.load called with the Uint8Array during merge', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    await generatePDF([pdf])
    expect(mocks.mockLaunch).not.toHaveBeenCalled()
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledWith(pdf)
  })

  it('HtmlUrl → goto called with the URL', async () => {
    await generatePDF(['https://example.com' as never])
    expect(mocks.mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'load' })
  })

  it('Single ImageUrl → setContent called with HTML containing an image tag', async () => {
    await generatePDF(['img.png' as ImageUrl])
    expect(mocks.mockSetContent).toHaveBeenCalledWith(
      expect.stringContaining('<img src="img.png" alt=""'),
      { waitUntil: 'load' },
    )
  })

  it('2 consecutive images → single launch call; HTML contains both img in order', async () => {
    await generatePDF(['a.png' as ImageUrl, 'b.jpg' as ImageUrl])
    expect(mocks.mockLaunch).toHaveBeenCalledTimes(1)
    const html = mocks.mockSetContent.mock.calls[0][0] as string
    expect(html.indexOf('<img src="a.png" alt=""')).toBeLessThan(html.indexOf('<img src="b.jpg" alt=""'))
  })

  it('2 non-consecutive images (separated by a PdfUrl) → two launch calls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }))

    await generatePDF(['a.png' as ImageUrl, 'doc.pdf' as PdfUrl, 'b.png' as ImageUrl])
    expect(mocks.mockLaunch).toHaveBeenCalledTimes(2)
  })

  it('result = value of mergePdfs\' save() (no two-pass overlay)', async () => {
    const expected = new Uint8Array([1, 2, 3])
    mocks.mockSave.mockResolvedValue(expected)
    const result = await generatePDF(['<p>test</p>' as never])
    expect(result).toBe(expected)
  })

  it('PDFDocument.load/addPage called N times (once per group/item) when merging', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    await generatePDF([pdf, '<p>html</p>' as never, 'img.png' as ImageUrl])
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledTimes(3)
    expect(mocks.mockAddPage).toHaveBeenCalledTimes(3)
  })

  it('PDFDocument.create() is called once per generatePDF call (fresh merge each time)', async () => {
    await generatePDF(['<p>first</p>' as never])
    await generatePDF(['<p>second</p>' as never])
    expect(mocks.mockPDFDocumentCreate).toHaveBeenCalledTimes(2)
  })

  it('test env: browser launch uses local executablePath resolver', async () => {
    await generatePDF(['<p>test</p>' as never])

    expect(mocks.mockPuppeteerExecutablePath).toHaveBeenCalledTimes(1)
    expect(mocks.mockChromiumExecutablePath).not.toHaveBeenCalled()
  })

  it('single group + pageNumber template → pass-through directly, only the merge-level PDFDocument.load (no two-pass overlay)', async () => {
    const pdfOptions = { footerTemplate: '<span class="pageNumber"></span>/<span class="totalPages"></span>' }
    await generatePDF(['<p>hello</p>' as never], pdfOptions)

    expect(mocks.mockPdf).toHaveBeenCalledWith(expect.objectContaining({
      displayHeaderFooter: true,
      footerTemplate: pdfOptions.footerTemplate,
    }))
    // a single group never triggers useGlobalPageNumbering (groups.length > 1
    // is required), so the only PDFDocument.load call left is mergePdfs' own
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledTimes(1)
  })

  it('footerTemplate without headerTemplate → headerTemplate defaults to an empty element (no Puppeteer default header leaks in)', async () => {
    const pdfOptions = { footerTemplate: '<div>footer</div>' }
    await generatePDF(['<p>hello</p>' as never], pdfOptions)

    expect(mocks.mockPdf).toHaveBeenCalledWith(expect.objectContaining({
      headerTemplate: '<span></span>',
      footerTemplate: pdfOptions.footerTemplate,
    }))
  })

  it('headerTemplate without footerTemplate → footerTemplate defaults to an empty element', async () => {
    const pdfOptions = { headerTemplate: '<div>header</div>' }
    await generatePDF(['<p>hello</p>' as never], pdfOptions)

    expect(mocks.mockPdf).toHaveBeenCalledWith(expect.objectContaining({
      headerTemplate: pdfOptions.headerTemplate,
      footerTemplate: '<span></span>',
    }))
  })

  it('multi-groups + static header/footer → pass-through per group, no two-pass overlay, no passthrough margin padding', async () => {
    const pdfOptions = { headerTemplate: '<div>My Company</div>' }
    await generatePDF(['<p>1</p>' as never, '<p>2</p>' as never], pdfOptions)

    expect(mocks.mockPdf).toHaveBeenCalledTimes(2)
    for (const call of mocks.mockPdf.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ displayHeaderFooter: true, headerTemplate: pdfOptions.headerTemplate }))
    }
    // no overlay pass: only the 2 merge-level PDFDocument.load calls (one per group)
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledTimes(2)
    expect(mocks.mockSetMediaBox).not.toHaveBeenCalled()
  })

  it('multi-groups + static header/footer + Uint8Array passthrough group → passthrough page kept at its original size (padPassthroughMargins false outside two-pass)', async () => {
    const passthroughPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const pdfOptions = { headerTemplate: '<div>My Company</div>', margin: { top: '20mm' } }

    await generatePDF(['<p>1</p>' as never, passthroughPdf], pdfOptions)

    expect(mocks.mockScale).not.toHaveBeenCalled()
    expect(mocks.mockSetMediaBox).not.toHaveBeenCalled()
    expect(mocks.mockSetCropBox).not.toHaveBeenCalled()
  })

  it('multi-groups + pageNumber/totalPages → two-pass overlay path', async () => {
    const finalBytes = new Uint8Array([7, 7, 7])
    const overlayBytes = new Uint8Array([9, 9, 9])
    const mockOverlayPage = {
      getMediaBox: () => ({ x: 0, y: 0, width: 595, height: 842 }),
      drawPage: mocks.mockDrawPage,
    }

    mocks.mockPdf
      .mockResolvedValueOnce(FAKE_PDF) // content group 1
      .mockResolvedValueOnce(FAKE_PDF) // content group 2
      .mockResolvedValueOnce(overlayBytes) // overlay render

    mocks.mockPDFDocumentLoad.mockResolvedValue({
      getPageIndices: () => [0],
      getPageCount: () => 2,
      getPages: () => [mockOverlayPage, mockOverlayPage],
      embedPage: mocks.mockEmbedPage,
      save: mocks.mockSave,
    })
    mocks.mockSave.mockResolvedValue(finalBytes)

    const pdfOptions = {
      margin: { top: '20mm' },
      footerTemplate: '<span class="pageNumber"></span>/<span class="totalPages"></span>',
    }
    const result = await generatePDF(['<p>1</p>' as never, '<p>2</p>' as never], pdfOptions)

    expect(result).toBe(finalBytes)
    expect(mocks.mockPdf).toHaveBeenCalledTimes(3)

    // content pages: margin reserved, but no header/footer painted
    expect(mocks.mockPdf).toHaveBeenNthCalledWith(1, expect.objectContaining({
      margin: expect.objectContaining({ top: '20mm' }),
    }))
    expect(mocks.mockPdf.mock.calls[0][0]).not.toHaveProperty('displayHeaderFooter')
    expect(mocks.mockPdf.mock.calls[1][0]).not.toHaveProperty('displayHeaderFooter')

    // overlay render: header/footer painted with the same margin, transparent
    // (no forced white background) so the content page shows through it
    expect(mocks.mockPdf).toHaveBeenNthCalledWith(3, expect.objectContaining({
      displayHeaderFooter: true,
      footerTemplate: pdfOptions.footerTemplate,
      margin: expect.objectContaining({ top: '20mm' }),
      printBackground: false,
    }))
    expect(mocks.mockAddStyleTag).toHaveBeenCalledTimes(2) // content pages only, not the overlay

    // 2 merge-level loads (one per content group) + 1 pageCount load + 2 overlayPages loads (content + overlay)
    expect(mocks.mockPDFDocumentLoad).toHaveBeenCalledTimes(5)
    expect(mocks.mockEmbedPage).toHaveBeenCalledTimes(2)
    expect(mocks.mockDrawPage).toHaveBeenCalledTimes(2)
  })

  it('multi-groups + pageNumber/totalPages + Uint8Array passthrough group → passthrough page is padded before merge (padPassthroughMargins only true in this path)', async () => {
    const passthroughPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const pdfOptions = {
      margin: { top: '20mm' },
      footerTemplate: '<span class="pageNumber"></span>/<span class="totalPages"></span>',
    }

    await generatePDF(['<p>1</p>' as never, passthroughPdf], pdfOptions)

    // padPdfPageMargins scales the passthrough page to fit A4 and repositions
    // its MediaBox/CropBox before the merge — only reachable when
    // useGlobalPageNumbering is true.
    expect(mocks.mockScale).toHaveBeenCalled()
    expect(mocks.mockSetMediaBox).toHaveBeenCalled()
    expect(mocks.mockSetCropBox).toHaveBeenCalled()
  })
})

describe('needsGlobalPageNumbering', () => {
  it('false when no template provided', () => {
    expect(needsGlobalPageNumbering(undefined, undefined)).toBe(false)
  })

  it('false for static templates', () => {
    expect(needsGlobalPageNumbering('<div>Header</div>', '<div>Footer</div>')).toBe(false)
  })

  it('true when headerTemplate references pageNumber', () => {
    expect(needsGlobalPageNumbering('<span class="pageNumber"></span>', undefined)).toBe(true)
  })

  it('true when footerTemplate references totalPages', () => {
    expect(needsGlobalPageNumbering(undefined, '<span class="totalPages"></span>')).toBe(true)
  })
})
