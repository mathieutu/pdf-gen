import type { ImageUrl, PdfUrl } from './types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPDFs, generatePDF, getBrowserLaunchOptions, groupConsecutiveImages } from './generate'

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

  const mockAdd = vi.fn().mockResolvedValue(undefined)
  const mockSaveAsBuffer = vi.fn().mockResolvedValue(PDF_BYTES)
  const MockPDFMerger = vi.fn(class MockPDFMerger {
    add = mockAdd
    saveAsBuffer = mockSaveAsBuffer
  })

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
    MockPDFMerger,
    mockAdd,
    mockSaveAsBuffer,
    getChromiumGraphicsMode: () => chromiumGraphicsMode,
    resetChromiumGraphicsMode: () => {
      chromiumGraphicsMode = true
    },
  }
})

const FAKE_PDF = mocks.PDF_BYTES

vi.mock('puppeteer-core', () => ({ default: { launch: mocks.mockLaunch } }))
vi.mock('puppeteer', () => ({ executablePath: mocks.mockPuppeteerExecutablePath }))
vi.mock('@sparticuz/chromium', () => ({ default: mocks.chromiumModule }))
vi.mock('pdf-merger-js', () => ({ default: mocks.MockPDFMerger }))

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
  it('routes HTML/url groups through injected converter and keeps existing PDFs untouched', async () => {
    const convertedImageGroup = new Uint8Array([1])
    const convertedHtml = new Uint8Array([2])
    const convertedUrl = new Uint8Array([3])
    const existingPdfBytes = new Uint8Array([9, 9])

    const convertHtml = vi.fn()
      .mockResolvedValueOnce(convertedImageGroup)
      .mockResolvedValueOnce(convertedHtml)
      .mockResolvedValueOnce(convertedUrl)

    const result = await createPDFs([
      ['a.png', 'b.jpg'],
      '<p>inline html</p>',
      'https://example.com/page',
      'doc.pdf',
      existingPdfBytes,
    ], convertHtml)

    expect(convertHtml).toHaveBeenCalledTimes(3)
    expect(convertHtml).toHaveBeenNthCalledWith(1, {
      html: expect.stringContaining('<img src="a.png" alt=""'),
    })
    expect(convertHtml).toHaveBeenNthCalledWith(2, { html: '<p>inline html</p>' })
    expect(convertHtml).toHaveBeenNthCalledWith(3, { url: 'https://example.com/page' })
    expect(result).toEqual([convertedImageGroup, convertedHtml, convertedUrl, 'doc.pdf', existingPdfBytes])
    expect(mocks.mockLaunch).not.toHaveBeenCalled()
  })
})

describe('generatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL', undefined)
    mocks.mockSaveAsBuffer.mockResolvedValue(FAKE_PDF)
    mocks.mockAdd.mockResolvedValue(undefined)
    mocks.mockPdf.mockResolvedValue(FAKE_PDF)
    mocks.resetChromiumGraphicsMode()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('local env → uses puppeteer executablePath only', async () => {
    const options = await getBrowserLaunchOptions()

    expect(options).toEqual({ executablePath: '/fake/chromium' })
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

  it('PdfUrl → launch NOT called; merger.add called with the string', async () => {
    await generatePDF(['doc.pdf' as PdfUrl])
    expect(mocks.mockLaunch).not.toHaveBeenCalled()
    expect(mocks.mockAdd).toHaveBeenCalledWith('doc.pdf')
  })

  it('Uint8Array → launch NOT called; merger.add called with the Uint8Array', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    await generatePDF([pdf])
    expect(mocks.mockLaunch).not.toHaveBeenCalled()
    expect(mocks.mockAdd).toHaveBeenCalledWith(pdf)
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
    await generatePDF(['a.png' as ImageUrl, 'doc.pdf' as PdfUrl, 'b.png' as ImageUrl])
    expect(mocks.mockLaunch).toHaveBeenCalledTimes(2)
  })

  it('result = value of merger.saveAsBuffer()', async () => {
    const expected = new Uint8Array([1, 2, 3])
    mocks.mockSaveAsBuffer.mockResolvedValue(expected)
    const result = await generatePDF(['<p>test</p>' as never])
    expect(result).toBe(expected)
  })

  it('merger.add called N times (one per group/item)', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    await generatePDF([pdf, '<p>html</p>' as never, 'img.png' as ImageUrl])
    expect(mocks.mockAdd).toHaveBeenCalledTimes(3)
  })

  it('new PDFMerger is created at each call', async () => {
    await generatePDF(['<p>first</p>' as never])
    await generatePDF(['<p>second</p>' as never])
    expect(mocks.MockPDFMerger).toHaveBeenCalledTimes(2)
  })

  it('test env: browser launch uses local executablePath resolver', async () => {
    await generatePDF(['<p>test</p>' as never])

    expect(mocks.mockPuppeteerExecutablePath).toHaveBeenCalledTimes(1)
    expect(mocks.mockChromiumExecutablePath).not.toHaveBeenCalled()
  })
})
