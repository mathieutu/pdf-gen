import type { NextRequest } from 'next/server'
import Buffer from 'node:buffer'
import chromium from '@sparticuz/chromium'
import PDFMerger from 'pdf-merger-js'
import puppeteer from 'puppeteer-core'

export const maxDuration = 60

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB for Vercel limits

const ensureArray = <T>(item: T | T[]): T[] => Array.isArray(item) ? item : [item]
const getBrowser = async () => {
  chromium.setGraphicsMode = false

  return puppeteer.launch(process.env.NODE_ENV === 'production' && process.env.VERCEL ? {
    args: [...chromium.args, '--font-render-hinting=none', '--hide-scrollbars', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: await chromium.executablePath(),
  } : { executablePath: (await import('puppeteer')).executablePath() })
}

const isImageUrl = (item: unknown): item is string =>
  typeof item === 'string' && (/^data:image\//i.test(item) || /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i.test(item))

const isPdfUrl = (item: unknown): item is string =>
  typeof item === 'string' && /\.pdf(?:\?.*)?$/i.test(item)

const isPdfDataUrl = (item: unknown): item is string =>
  typeof item === 'string' && /^data:application\/pdf;base64,/i.test(item)

const decodePDFDataUrl = (dataUrl: string): Uint8Array =>
  new Uint8Array(Buffer.from(dataUrl.replace(/^data:application\/pdf;base64,/i, ''), 'base64'))

const buildImagesHtml = (urls: string[]) =>
  `<html><body style="margin:0;padding:16px;box-sizing:border-box;background:white;display:flex;flex-direction:column;align-items:center;gap:16px">${urls.map(u => `<img src="${u}" style="max-width:100%;object-fit:contain">`).join('')}</body></html>`

async function convertHTML({ url, html }: { url?: string, html?: string }) {
  const browser = await getBrowser()
  const page = await browser.newPage()

  if (isImageUrl(url)) {
    await page.setContent(buildImagesHtml([url]), { waitUntil: 'load' })
  } else if (url) {
    await page.goto(url, { waitUntil: 'load' })
  } else {
    await page.setContent(html!, { waitUntil: 'load' })
  }

  await page.addStyleTag({ content: 'html, body { background: white !important; }' })

  const pdfBuffer = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    format: 'a4',
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  })
  await browser.close()

  return pdfBuffer as Uint8Array<ArrayBuffer>
}

type Item = string | Uint8Array

const isHtmlString = (item: unknown): item is string =>
  typeof item === 'string' && item.trimStart().startsWith('<')

const groupConsecutiveImages = (items: Item[]) => items
  .reduce<(string | string[] | Uint8Array)[]>((groups, item) => {
    const last = groups.at(-1)

    if (isImageUrl(item) && Array.isArray(last)) {
      return [...groups.slice(0, -1), [...last, item]]
    }

    return [...groups, isImageUrl(item) ? [item] : item]
  }, [])

const createPDFs = (groups: (string | string[] | Uint8Array)[]): Promise<Uint8Array[]> => Promise.all(
  groups.map(group => {
    if (Array.isArray(group)) return convertHTML({ html: buildImagesHtml(group) })

    if (isHtmlString(group)) return convertHTML({ html: group })

    if (isPdfDataUrl(group)) return decodePDFDataUrl(group) // no used because already decoded?

    if (isPdfUrl(group) || group instanceof Uint8Array) return group

    return convertHTML({ url: group })
  }),
)

async function generatePDF(itemsToMerge: Item[]) {
  const merger = new PDFMerger()
  const groups = groupConsecutiveImages(itemsToMerge)
  const pdfs = await createPDFs(groups)

  for (const pdf of pdfs) {
    await merger.add(pdf)
  }

  return await merger.saveAsBuffer() as Uint8Array<ArrayBuffer>
}

type GenParams = { items: Item[], filename?: string }

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

const parseGetParams = (request: NextRequest): GenParams => {
  const { searchParams } = request.nextUrl
  return {
    items: [
      ...searchParams.getAll('urls'),
      ...searchParams.getAll('url'),
      ...searchParams.getAll('merge'),
      ...searchParams.getAll('files'),
      ...searchParams.getAll('file'),
      ...searchParams.getAll('html'),
    ].filter(Boolean),
    filename: searchParams.get('filename') || undefined,
  }
}

const ITEM_KEYS = new Set(['url', 'urls', 'merge', 'file', 'files', 'html'])

const processStringItem = (value: string): string | Uint8Array => {
  if (isPdfDataUrl(value as unknown)) return decodePDFDataUrl(value)

  if (value.startsWith('data:') && !isImageUrl(value as unknown))
    throw new HttpError(400, `Unsupported data URL type. Only image and PDF data URLs are accepted.`)

  return value
}

const parseJsonBody = async (request: NextRequest): Promise<GenParams> => {
  const body = await request.json() as { html?: string | string[], url?: string | string[], urls?: string | string[], merge?: string | string[], file?: string | string[], files?: string | string[], filename?: string }

  return {
    filename: body.filename,
    items: [
      ...ensureArray(body.html ?? []),
      ...ensureArray(body.url ?? []),
      ...ensureArray(body.urls ?? []),
      ...ensureArray(body.merge ?? []),
      ...ensureArray(body.file ?? []),
      ...ensureArray(body.files ?? []),
    ].map(processStringItem),
  }
}

const processFileItem = async (file: File): Promise<Item> => {
  if (file.size > MAX_FILE_SIZE)
    throw new HttpError(413, `File "${file.name}" exceeds the 4 MB limit.`)

  if (file.type.startsWith('image/')) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    return `data:${file.type};base64,${base64}`
  }

  if (file.type === 'application/pdf')
    return new Uint8Array(await file.arrayBuffer())

  if (file.type === 'text/html')
    return file.text()

  throw new HttpError(400, `Unsupported file type "${file.type}". Only PDF, image, and HTML files are accepted.`)
}

const parseFormBody = async (request: NextRequest): Promise<GenParams> => {
  const formData = await request.formData()

  const items = await Promise.all(
    [...formData.entries()]
      .filter(([key, value]) => ITEM_KEYS.has(key) && (value instanceof File ? !!value.name : !!value))
      .map(([, value]) => value instanceof File ? processFileItem(value) : processStringItem(value as string)),
  )

  return {
    filename: (formData.get('filename') as string) || undefined,
    items,
  }
}

const pdfResponse = (pdf: Uint8Array<ArrayBuffer>, filename?: string) =>
  new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      ...(filename && { 'Content-Disposition': `attachment; filename="${filename}"` }),
    },
  })

export const GET = async (request: NextRequest) => {
  const { filename, items } = parseGetParams(request)

  if (!items.length) {
    return Response.json({ error: '\'urls\' must be provided' }, { status: 400 })
  }

  try {
    const pdf = await generatePDF(items)
    return pdfResponse(pdf, filename)
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const { filename, items } = await (
      request.headers.get('content-type')?.includes('application/json')
        ? parseJsonBody(request)
        : parseFormBody(request)
    )

    if (!items.length) {
      return Response.json({ error: 'Either \'html\', \'urls\', or \'files\' must be provided' }, { status: 400 })
    }

    const pdf = await generatePDF(items)
    return pdfResponse(pdf, filename ?? 'output.pdf')
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
