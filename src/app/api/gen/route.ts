import type { NextRequest } from 'next/server'
import chromium from '@sparticuz/chromium'
import PDFMerger from 'pdf-merger-js'

import puppeteer from 'puppeteer-core'

export const maxDuration = 60

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

const generatePDF = async ({ url, html, merge }: { url?: string, html?: string, merge: string[] }): Promise<Uint8Array<ArrayBuffer>> => {
  if (!merge.length) {
    return convertHtml({ url, html })
  }

  if (!url && !html) {
    return mergePDF(merge)
  }

  return mergePDF([await convertHtml({ url, html }), ...merge])
}

type GenParams = { url?: string, html?: string, merge: string[], filename?: string }

const parseGetParams = (request: NextRequest): GenParams => {
  const { searchParams } = request.nextUrl
  return {
    url: searchParams.get('url') || undefined,
    merge: searchParams.getAll('merge').filter(Boolean),
  }
}

const parseJsonBody = async (request: NextRequest): Promise<GenParams> => {
  const body = await request.json() as { html?: string, url?: string, merge?: string[], filename?: string }
  return {
    url: body.url,
    html: body.html,
    merge: body.merge ?? [],
    filename: body.filename,
  }
}

const parseFormBody = async (request: NextRequest): Promise<GenParams> => {
  const formData = await request.formData()
  return {
    url: (formData.get('url') as string) || undefined,
    html: (formData.get('html') as string) || undefined,
    merge: (formData.getAll('merge') as string[]).filter(Boolean),
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

const hasContent = ({ url, html, merge }: GenParams) => !!(url || html || merge.length)

export const GET = async (request: NextRequest) => {
  const params = parseGetParams(request)

  if (!hasContent(params)) {
    return Response.json({ error: 'Either \'url\' or \'merge\' must be provided' }, { status: 400 })
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
    return Response.json({ error: 'Either \'html\', \'url\' or \'merge\' must be provided' }, { status: 400 })
  }

  try {
    const pdf = await generatePDF(params)
    return pdfResponse(pdf, params.filename ?? 'output.pdf')
  } catch (error) {
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
