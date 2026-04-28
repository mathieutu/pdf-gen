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
  typeof item === 'string' && item.toLowerCase().endsWith('.pdf')

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

  return pdfBuffer
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

  return merger.saveAsBuffer()
}

const generatePDF = async ({ url, html, merge }: { url?: string, html?: string, merge: string[] }) => {
  if (!merge.length) {
    return convertHtml({ url, html })
  }

  if (!url && !html) {
    return mergePDF(merge)
  }

  return mergePDF([await convertHtml({ url, html }), ...merge])
}

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl
  const url = searchParams.get('url') ?? undefined
  const merge = searchParams.getAll('merge') ?? []

  if (!url && !merge.length) {
    return Response.json({ error: 'Either \'url\' or \'merge\' must be provided' }, { status: 400 })
  }
  try {
    const pdf = await generatePDF({ url, merge })

    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { html, url, merge = [], filename = 'output.pdf' } = await request.json()

  if (!html && !url && !merge.length) {
    return Response.json({ error: 'Either \'html\', \'url\' or \'merge\' must be provided' }, { status: 400 })
  }

  try {
    const pdf = await generatePDF({ url, html, merge })

    return new Response(pdf as Uint8Array<ArrayBuffer>, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
