import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

import { NextRequest } from 'next/server'

export const maxDuration = 60

const getBrowser = async () => {
  chromium.setGraphicsMode = false

  return puppeteer.launch(process.env.NODE_ENV === 'production' ? {
    args: [...chromium.args, '--font-render-hinting=none', '--hide-scrollbars', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  } : { executablePath: (await import('puppeteer')).executablePath() })
}

const generatePDF = async ({ url, html }: { url?: string, html?: string }) => {
  try {
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

  if (!url) {
    return Response.json(
      { error: '\'url\' must be provided' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
  try {
    const pdf =  await generatePDF({ url })

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
  const { html, url, filename = 'output.pdf' } = await request.json()

  if (!html && !url) {
    return Response.json(
      { error: 'Either \'html\' or \'url\' must be provided' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const pdf = await generatePDF({ url, html })

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
