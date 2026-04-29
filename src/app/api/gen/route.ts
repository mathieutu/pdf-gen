import type { NextRequest } from 'next/server'
import chromium from '@sparticuz/chromium'
import PDFMerger from 'pdf-merger-js'

import puppeteer from 'puppeteer-core'

export const maxDuration = 60

const ensureArray = <T>(item: T | T[]): T[] => Array.isArray(item) ? item : [item]
const getBrowser = async () => {
  chromium.setGraphicsMode = false

  return puppeteer.launch(process.env.NODE_ENV === 'production' && process.env.VERCEL ? {
    args: [...chromium.args, '--font-render-hinting=none', '--hide-scrollbars', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: await chromium.executablePath(),
  } : { executablePath: (await import('puppeteer')).executablePath() })
}

const isImageUrl = (item: unknown): item is string =>
  typeof item === 'string' && /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i.test(item)

const isPdfUrl = (item: unknown): item is string =>
  typeof item === 'string' && /\.pdf(?:\?.*)?$/i.test(item)

const buildImagesHtml = (urls: string[]) =>
  `<html><body style="margin:0;padding:16px;box-sizing:border-box;background:white;display:flex;flex-direction:column;align-items:center;gap:16px">${urls.map(u => `<img src="${u}" style="max-width:100%;object-fit:contain">`).join('')}</body></html>`

async function convertHtml({ url, html }: { url?: string, html?: string }) {
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

const groupConsecutiveImages = (items: (string | Uint8Array<ArrayBufferLike>)[]) =>
  Promise.all(items
    .reduce<(string | string[] | Uint8Array<ArrayBufferLike>)[]>((groups, item) => {
      const last = groups.at(-1)

      if (isImageUrl(item) && Array.isArray(last)) {
        return [...groups.slice(0, -1), [...last, item]]
      }

      return [...groups, isImageUrl(item) ? [item] : item]
    }, [])
    .map(group => {
      if (Array.isArray(group)) {
        return convertHtml({ html: buildImagesHtml(group) })
      }

      if (isPdfUrl(group) || group instanceof Uint8Array) {
        return group
      }

      return convertHtml({ url: group })
    }))

async function mergePDF(itemsToMerge: (Uint8Array<ArrayBufferLike> | string)[]) {
  const merger = new PDFMerger()
  const groups = await groupConsecutiveImages(itemsToMerge)

  for (const group of groups) {
    await merger.add(group)
  }

  return await merger.saveAsBuffer() as Uint8Array<ArrayBuffer>
}

const generatePDF = async ({ urls, html }: GenParams): Promise<Uint8Array<ArrayBuffer>> => {
  if (!html) {
    return mergePDF(urls)
  }

  if (!urls.length) {
    return convertHtml({ html })
  }

  return mergePDF([await convertHtml({ html }), ...urls])
}

type GenParams = { urls: string[], html?: string, filename?: string }

const parseGetParams = (request: NextRequest): GenParams => {
  const { searchParams } = request.nextUrl
  return {
    // Deprecated: 'merge' is aliased to 'urls'
    urls: [...searchParams.getAll('urls'), ...searchParams.getAll('url'), ...searchParams.getAll('merge')].filter(Boolean),
  }
}

const parseJsonBody = async (request: NextRequest): Promise<GenParams> => {
  const body = await request.json() as { html?: string, url?: string, urls?: string[], merge?: string[], filename?: string }
  return {
    html: body.html,
    // Deprecated: single 'url' string and 'merge' are aliased to 'urls'
    urls: [...(body.urls ?? []), ...ensureArray(body.url ?? []), ...ensureArray(body.merge ?? [])],
    filename: body.filename,
  }
}

const parseFormBody = async (request: NextRequest): Promise<GenParams> => {
  const formData = await request.formData()
  return {
    html: (formData.get('html') as string) || undefined,
    // Deprecated: single 'url' string and 'merge' are aliased to 'urls'
    urls: [...(formData.getAll('urls') as string[]), ...(formData.getAll('url') as string[]), ...(formData.getAll('merge') as string[])].filter(Boolean),
    filename: (formData.get('filename') as string) || undefined,
  }
}

const parsePostParams = (request: NextRequest): Promise<GenParams> =>
  request.headers.get('content-type')?.includes('application/json')
    ? parseJsonBody(request)
    : parseFormBody(request)

const pdfResponse = (pdf: Uint8Array<ArrayBuffer>, filename?: string) =>
  new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      ...(filename && { 'Content-Disposition': `attachment; filename="${filename}"` }),
    },
  })

const hasContent = ({ urls, html }: GenParams) => !!(html || urls.length)

export const GET = async (request: NextRequest) => {
  const params = parseGetParams(request)

  if (!hasContent(params)) {
    return Response.json({ error: "'urls' must be provided" }, { status: 400 })
  }

  try {
    const pdf = await generatePDF(params)
    return pdfResponse(pdf)
  } catch (error) {
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

export const POST = async (request: NextRequest) => {
  const params = await parsePostParams(request)

  if (!hasContent(params)) {
    return Response.json({ error: "Either 'html' or 'urls' must be provided" }, { status: 400 })
  }

  try {
    const pdf = await generatePDF(params)
    return pdfResponse(pdf, params.filename ?? 'output.pdf')
  } catch (error) {
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
