import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import PDFMerger from 'pdf-merger-js';

import {NextRequest} from 'next/server'

export const maxDuration = 60

const getBrowser = async () => {
  chromium.setGraphicsMode = false

  return puppeteer.launch(process.env.NODE_ENV === 'production' && process.env.VERCEL ? {
    args: [...chromium.args, '--font-render-hinting=none', '--hide-scrollbars', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  } : { executablePath: (await import('puppeteer')).executablePath() })
}

async function convertHtml({url, html}: {url?: string, html?: string}) {
  const browser = await getBrowser()
  const page = await browser.newPage()

  if (url) {
    await page.goto(url, {waitUntil: 'load'})
  } else {
    await page.setContent(html!, {waitUntil: 'load'})
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

  return pdfBuffer;
}

async function mergePDF(pdfsToMerge: (Uint8Array<ArrayBufferLike>| string)[]) {
  const merger = new PDFMerger()

  for (const pdf of pdfsToMerge) {
    await merger.add(pdf);
  }

  return merger.saveAsBuffer()
}

const generatePDF = async ({ url, html, merge }: { url?: string, html?: string, merge: string[] }) => {
  try {

    if (!merge.length) {
      return convertHtml({ url, html })
    }

    if (!url && !html) {
      return mergePDF(merge)
    }

    return mergePDF([await convertHtml({ url, html }), ...merge])
  } catch (error) {
    console.error('Error generating PDF:', error)

    throw Response.json({ error: 'Failed to generate PDF' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl
  const url = searchParams.get('url') ?? undefined
  const merge = searchParams.getAll('merge') ?? []

  if (!url && !merge.length) {
    return Response.json(
      { error: 'Either \'url\' or \'merge\' must be provided' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
  try {
    const pdf =  await generatePDF({ url, merge })

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    })

  } catch (error) {
    return error as Response
  }
}

export async function POST(request: NextRequest) {
  const { html, url, merge = [], filename = 'output.pdf' } = await request.json()

  if (!html && !url && !merge.length) {
    return Response.json(
      { error: 'Either \'html\', \'url\' or \'merge\' must be provided' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const pdf = await generatePDF({ url, html, merge })

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return error as Response
  }
}
