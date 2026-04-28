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

async function convertHtml({ url, html }: { url?: string, html?: string }) {
  const browser = await getBrowser()
  const page = await browser.newPage()

  if (url) {
    await page.goto(url, { waitUntil: 'load' })
  } else {
    await page.setContent(html!, { waitUntil: 'load' })
  }

  const pdfBuffer = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    format: 'a4',
    margin: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  })
  await browser.close()

  return pdfBuffer
}

async function mergePDF(pdfsToMerge: (Uint8Array<ArrayBufferLike> | string)[]) {
  const merger = new PDFMerger()

  for (const pdf of pdfsToMerge) {
    await merger.add(pdf)
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
