import type { Item } from './types'
import chromium from '@sparticuz/chromium'
import PDFMerger from 'pdf-merger-js'
import puppeteer from 'puppeteer-core'
import { isHtmlString, isImageUrl, isPdfUrl } from './types'

type HtmlConversionInput = { url?: string, html?: string }
type HtmlToPdfConverter = (input: HtmlConversionInput) => Promise<Uint8Array>

const SERVERLESS_CHROMIUM_ARGS = [
  '--font-render-hinting=none',
  '--hide-scrollbars',
  '--disable-web-security',
  '--no-sandbox',
  '--disable-setuid-sandbox',
]

export const getBrowserLaunchOptions = async () => {
  if ('setGraphicsMode' in chromium) {
    chromium.setGraphicsMode = false
  }

  const isServerlessProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL

  return isServerlessProduction ? {
    args: [...chromium.args, ...SERVERLESS_CHROMIUM_ARGS],
    executablePath: await chromium.executablePath(),
  } : { executablePath: await (await import('puppeteer')).executablePath() }
}

const getBrowser = async () => puppeteer.launch(await getBrowserLaunchOptions())

const buildImagesHtml = (urls: string[]) =>
  `<html lang="en"><body style="margin:0;padding:16px;box-sizing:border-box;background:white;display:flex;flex-direction:column;align-items:center;gap:16px">${urls.map(u => `<img src="${u}" alt="" style="max-width:100%;object-fit:contain">`).join('')}</body></html>`

const convertHTMLWithBrowser: HtmlToPdfConverter = async ({ url, html }) => {
  const browser = await getBrowser()
  const page = await browser.newPage()

  if (url) {
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

  return pdfBuffer as Uint8Array
}

export const groupConsecutiveImages = (items: Item[]) => items
  .reduce<(string | string[] | Uint8Array)[]>((groups, item) => {
    const last = groups.at(-1)

    if (isImageUrl(item) && Array.isArray(last)) {
      return [...groups.slice(0, -1), [...last, item]]
    }

    return [...groups, isImageUrl(item) ? [item] : item]
  }, [])

export const createPDFs = (
  groups: (string | string[] | Uint8Array)[],
  convertHtml: HtmlToPdfConverter = convertHTMLWithBrowser,
): Promise<(string | Uint8Array)[]> => Promise.all(
  groups.map(group => {
    if (Array.isArray(group)) {
      return convertHtml({ html: buildImagesHtml(group) })
    }
    if (isHtmlString(group)) {
      return convertHtml({ html: group })
    }
    if (isPdfUrl(group) || group instanceof Uint8Array) {
      return group
    }
    return convertHtml({ url: group })
  }),
)

export const generatePDF = async (itemsToMerge: Item[]) => {
  const merger = new PDFMerger()
  const groups = groupConsecutiveImages(itemsToMerge)
  const pdfs = await createPDFs(groups)

  for (const pdf of pdfs) {
    await merger.add(pdf)
  }

  return await merger.saveAsBuffer() as Uint8Array<ArrayBuffer>
}
