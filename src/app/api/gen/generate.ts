import type { PDFPage } from 'pdf-lib'
import type { Item, PageFormat, PdfOptions } from './types'
import chromium from '@sparticuz/chromium'
import { PDFDocument } from 'pdf-lib'
import puppeteer from 'puppeteer-core'
import { HttpError, isHtmlString, isImageUrl, isPdfUrl } from './types'

type HtmlConversionInput = { url?: string, html?: string, headerTemplate?: string, footerTemplate?: string, margin?: PdfOptions['margin'], pageSize?: PdfOptions['pageSize'], transparent?: boolean }
type HtmlToPdfConverter = (input: HtmlConversionInput) => Promise<Uint8Array>

// Puppeteer falls back to its own default template (showing the date, title,
// URL...) for whichever of header/footer isn't explicitly provided once
// displayHeaderFooter is on — an empty element suppresses it instead.
const EMPTY_TEMPLATE = '<span></span>'

export const getBrowserLaunchOptions = async () => {
  if ('setGraphicsMode' in chromium) {
    chromium.setGraphicsMode = false
  }

  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    return {
      args: [...chromium.args, '--font-render-hinting=none', '--hide-scrollbars', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: await chromium.executablePath(),
    }
  }

  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    return {
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--hide-scrollbars'],
    }
  }

  return {
    executablePath: await (await import('puppeteer')).executablePath(),
    // CI runners (e.g. GitHub Actions on ubuntu-latest) restrict unprivileged
    // user namespaces, breaking Chromium's sandbox. Only disable it there,
    // keep it enabled for local dev where untrusted HTML/URLs may be rendered.
    ...process.env.CI && {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--hide-scrollbars'],
    },
  }
}

const getBrowser = async () => puppeteer.launch(await getBrowserLaunchOptions())

const buildImagesHtml = (urls: string[]) =>
  `<html><body style="margin:0;padding:16px;box-sizing:border-box;background:white;display:flex;flex-direction:column;align-items:center;gap:16px">${urls.map(u => `<img src="${u}" alt="" style="max-width:100%;object-fit:contain">`).join('')}</body></html>`

// Derived from puppeteer-core's own unitToPixels table (px:1, in:96, cm:37.8,
// mm:3.78), converted to points (× 72/96), so the margin added to
// passthrough pages matches exactly (same rounding) the one Puppeteer
// reserves on the pages it generates.
const PT_PER_CSS_UNIT: Record<string, number> = { px: 0.75, in: 72, cm: 28.35, mm: 2.835 }

export const cssLengthToPoints = (value?: string): number => {
  if (!value) return 0
  const [, amount, unit = 'px'] = value.match(/^(\d+(?:\.\d+)?)(px|in|cm|mm)?$/i) ?? []
  return Number(amount) * PT_PER_CSS_UNIT[unit.toLowerCase()]
}

// Empirically measured MediaBox that this project's pinned Puppeteer/Chromium build
// actually produces for `page.pdf({ format: 'a4' })` — verified by rendering a page
// and reading its MediaBox back with pdf-lib, NOT the commonly-quoted ISO 216
// approximation (595.28 x 841.89pt), which is off by ~0.64pt/0.03pt from what
// Chromium's print pipeline really outputs. Kept as the byte-exact default so
// existing callers (no pageSize / format 'a4') see zero change in output.
export const A4_SIZE = { width: 595.91998, height: 841.91998 }

// Same empirical-measurement approach as A4_SIZE above, applied to every other named
// preset Puppeteer supports: rendering `page.pdf({ format: <name> })` and reading the
// resulting MediaBox back with pdf-lib does NOT reproduce the nominal ISO 216/ANSI mm
// dimensions converted through cssLengthToPoints (Chromium's print pipeline applies
// its own sub-point rounding, same as it does for A4) — off by up to ~0.9pt, enough
// to visibly misalign a passthrough page against its Puppeteer-rendered siblings when
// both must land on the exact same canvas (see fitPassthroughPageToSize). Re-measure
// and update this table if the pinned Puppeteer/Chromium version changes.
const PAGE_FORMAT_SIZES_POINTS: Record<Exclude<PageFormat, 'a4'>, { width: number, height: number }> = {
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  tabloid: { width: 792, height: 1224 },
  ledger: { width: 1224, height: 792 },
  a3: { width: 841.91998, height: 1191.12 },
  a5: { width: 420, height: 595.91998 },
  a6: { width: 298.07999, height: 420 },
}

type ResolvedPageSize =
  | { format: PageFormat, points: { width: number, height: number } }
  | { width: string, height: string, points: { width: number, height: number } }

// Resolves a pageSize option into what `page.pdf()` should receive, in
// portrait orientation — landscape is applied separately (see
// `getTargetPagePoints` and the `landscape` option passed to `page.pdf()`
// in `convertHTMLWithBrowser`), since Puppeteer swaps width/height for both
// the `format` shortcut and explicit `width`/`height` the same way (verified
// empirically alongside the measurements above).
const resolvePageSize = (pageSize?: PdfOptions['pageSize']): ResolvedPageSize => {
  const { format = 'a4', width, height } = pageSize ?? {}

  // Custom dimensions can't be pre-measured (any value is possible), so this is
  // the one case where the passthrough-fit target is only approximately (not
  // byte-exactly) what Chromium renders — see the comment on
  // PAGE_FORMAT_SIZES_POINTS above for the scale of that imprecision.
  if (width && height) {
    return { width, height, points: { width: cssLengthToPoints(width), height: cssLengthToPoints(height) } }
  }

  return { format, points: format === 'a4' ? A4_SIZE : PAGE_FORMAT_SIZES_POINTS[format] }
}

// The final target size (in points, portrait/landscape already applied) that both
// the Puppeteer-rendered pages and the fitted passthrough pages (see
// `fitPassthroughPageToSize`) must share for a given pdfOptions.pageSize.
export const getTargetPagePoints = (pageSize?: PdfOptions['pageSize']): { width: number, height: number } => {
  const { points } = resolvePageSize(pageSize)
  return pageSize?.landscape ? { width: points.height, height: points.width } : points
}

const convertHTMLWithBrowser: HtmlToPdfConverter = async ({
  url,
  html,
  headerTemplate,
  footerTemplate,
  margin,
  pageSize,
  transparent,
}) => {
  const browser = await getBrowser()
  const page = await browser.newPage()

  if (url) {
    await page.goto(url, { waitUntil: 'load' })
  } else {
    await page.setContent(html!, { waitUntil: 'load' })
  }

  // The page-number overlay is rendered as its own page and composited over
  // the content page afterwards — it must stay transparent, or its (opaque)
  // background would hide the content page underneath it.
  if (!transparent) {
    await page.addStyleTag({ content: 'html, body { background: white !important; }' })
  }

  // preferCSSPageSize: false is not enough on its own — verified empirically that
  // Chromium's print pipeline still honors a target `@page` rule's size/orientation
  // *and* margin over our own explicit page.pdf() options, even with the flag off.
  // Overriding the values via an injected (even !important) stylesheet doesn't fully
  // cede control either — Chromium keeps blending it with our own margin. Actually
  // deleting the `@page` rule(s) from the CSSOM is the only approach that reliably
  // hands full control back to our own pdfOptions.pageSize/margin.
  if (pageSize) {
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (let i = sheet.cssRules.length - 1; i >= 0; i -= 1) {
            if (sheet.cssRules[i].type === CSSRule.PAGE_RULE) sheet.deleteRule(i)
          }
        } catch {
          // Cross-origin stylesheets throw on .cssRules access (CORS) — an @page
          // rule hiding in one of those can't be stripped this way, a known gap.
        }
      }
    })
  }

  const resolvedPageSize = resolvePageSize(pageSize)

  const pdfBuffer = await page.pdf({
    // Mirrors a browser's print dialog: the target page's own `@page` CSS (if any)
    // only supplies the *default* size/margin — an explicit pdfOptions.pageSize from
    // the caller must always win over it, the same way picking a paper size in the
    // print dialog overrides the page's own @page rule. Puppeteer's flag is binary
    // (no "CSS as default, still overridable" mode), so this is only ever true when
    // the caller left pageSize unset entirely, deferring fully to the page's CSS.
    preferCSSPageSize: !pageSize,
    printBackground: !transparent,
    landscape: pageSize?.landscape,
    ...'format' in resolvedPageSize
      ? { format: resolvedPageSize.format }
      : { width: resolvedPageSize.width, height: resolvedPageSize.height },
    margin: { top: 0, bottom: 0, left: 0, right: 0, ...margin },
    ...(headerTemplate || footerTemplate) && {
      displayHeaderFooter: true,
      headerTemplate: headerTemplate ?? EMPTY_TEMPLATE,
      footerTemplate: footerTemplate ?? EMPTY_TEMPLATE,
    },
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

export const mergePdfs = async (pdfs: Uint8Array[]): Promise<Uint8Array> => {
  const mergedDoc = await PDFDocument.create()
  for (const pdf of pdfs) {
    const doc = await PDFDocument.load(pdf)
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices())
    pages.forEach(page => mergedDoc.addPage(page))
  }
  // Object streams would compress the /ModDate that pdf-lib stamps on every
  // save(), turning a fixed-length date difference into a variable-length
  // binary diff and breaking the byte-for-byte example.pdf snapshot test.
  return mergedDoc.save({ useObjectStreams: false })
}

export const fetchPdfBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new HttpError(502, `Failed to fetch PDF from "${url}"`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

// Fits a passthrough page's own content (whatever its native size/aspect ratio) into
// the target canvas, with `margin` reserved as a visual inset — the same model
// Puppeteer uses for the pages it renders (a margin carves out space *within* a
// fixed-size canvas, it never grows the canvas itself). A single uniform scale factor
// (the tighter of the two axes) preserves the page's aspect ratio, leaving white
// bands on the other axis rather than stretching/squashing the content, then the
// scaled page is centered in the leftover space on that axis. `page.scale()`
// (pdf-lib) moves content *and* annotations together (verified empirically: a link's
// /Rect scales consistently with the content it's anchored to), unlike
// embedPage/drawPage which would flatten the page and drop annotations entirely.
export const fitPassthroughPageToSize = (page: PDFPage, targetSize: { width: number, height: number }, margin?: PdfOptions['margin']): void => {
  const top = cssLengthToPoints(margin?.top)
  const bottom = cssLengthToPoints(margin?.bottom)
  const left = cssLengthToPoints(margin?.left)
  const right = cssLengthToPoints(margin?.right)

  const contentWidth = targetSize.width - left - right
  const contentHeight = targetSize.height - top - bottom

  const { x, y, width, height } = page.getMediaBox()
  const factor = Math.min(contentWidth / width, contentHeight / height)

  page.scale(factor, factor)

  const scaledWidth = width * factor
  const scaledHeight = height * factor
  const offsetX = left + (contentWidth - scaledWidth) / 2
  const offsetY = bottom + (contentHeight - scaledHeight) / 2

  // Same MediaBox-origin-shift technique as before: since scale() doesn't move the
  // page's own (x, y) origin, shifting it by -offset places the (already scaled,
  // already-positioned) content at the right inset from the new canvas' corner,
  // without touching a single drawing/annotation coordinate.
  page.setMediaBox(x - offsetX, y - offsetY, targetSize.width, targetSize.height)
  page.setCropBox(x - offsetX, y - offsetY, targetSize.width, targetSize.height)
}

export const padPdfPageMargins = async (pdfBytes: Uint8Array, margin?: PdfOptions['margin'], pageSize?: PdfOptions['pageSize']): Promise<Uint8Array> => {
  const doc = await PDFDocument.load(pdfBytes)
  const targetSize = getTargetPagePoints(pageSize)
  for (const page of doc.getPages()) {
    fitPassthroughPageToSize(page, targetSize, margin)
  }

  return doc.save({ useObjectStreams: false })
}

export const createPDFs = (
  groups: (string | string[] | Uint8Array)[],
  pdfOptions?: PdfOptions,
  convertHtml: HtmlToPdfConverter = convertHTMLWithBrowser,
  padPassthroughMargins = false,
): Promise<Uint8Array[]> => Promise.all(
  groups.map(async group => {
    if (Array.isArray(group)) {
      return convertHtml({ html: buildImagesHtml(group), ...pdfOptions })
    }
    if (isHtmlString(group)) {
      return convertHtml({ html: group, ...pdfOptions })
    }
    if (isPdfUrl(group)) {
      const bytes = await fetchPdfBytes(group)
      return padPassthroughMargins ? padPdfPageMargins(bytes, pdfOptions?.margin, pdfOptions?.pageSize) : bytes
    }
    if (group instanceof Uint8Array) {
      return padPassthroughMargins ? padPdfPageMargins(group, pdfOptions?.margin, pdfOptions?.pageSize) : group
    }
    return convertHtml({ url: group, ...pdfOptions })
  }),
)

export const needsGlobalPageNumbering = (headerTemplate?: string, footerTemplate?: string): boolean =>
  [headerTemplate, footerTemplate].some(template => template?.includes('pageNumber') || template?.includes('totalPages'))

export const renderPageNumberOverlay = (
  pageCount: number,
  pdfOptions: PdfOptions,
  convertHtml: HtmlToPdfConverter = convertHTMLWithBrowser,
): Promise<Uint8Array> => {
  const pages = Array.from(
    { length: pageCount },
    (_, index) => `<div style="height: 100vh;${index > 0 ? ' page-break-before: always;' : ''}"></div>`,
  ).join('')

  return convertHtml({
    html: `<html><body style="margin:0">${pages}</body></html>`,
    headerTemplate: pdfOptions.headerTemplate,
    footerTemplate: pdfOptions.footerTemplate,
    margin: pdfOptions.margin,
    pageSize: pdfOptions.pageSize,
    transparent: true,
  })
}

export const overlayPages = async (contentPdf: Uint8Array, overlayPdf: Uint8Array): Promise<Uint8Array> => {
  const contentDoc = await PDFDocument.load(contentPdf)
  const overlayDoc = await PDFDocument.load(overlayPdf)

  const contentPages = contentDoc.getPages()
  const overlayPages = overlayDoc.getPages()

  for (const [index, page] of contentPages.entries()) {
    const embeddedOverlayPage = await contentDoc.embedPage(overlayPages[index])
    // drawPage's x/y are absolute PDF user-space coordinates, not
    // page-relative ones — for an untouched Puppeteer page (MediaBox at
    // (0, 0)) that's the same thing, but a padded passthrough page (see
    // padPdfPageMargins) has its MediaBox origin shifted, so anchoring on
    // (0, 0) would draw the overlay offset from the page's own visible
    // corner instead of covering it.
    const { x, y, width, height } = page.getMediaBox()
    page.drawPage(embeddedOverlayPage, { x, y, width, height })
  }

  // Object streams would compress the /ModDate that pdf-lib stamps on every
  // save(), turning a fixed-length date difference into a variable-length
  // binary diff and breaking the byte-for-byte example.pdf snapshot test.
  return contentDoc.save({ useObjectStreams: false })
}

export const generatePDF = async (itemsToMerge: Item[], pdfOptions?: PdfOptions) => {
  const groups = groupConsecutiveImages(itemsToMerge)
  const useGlobalPageNumbering = groups.length > 1
    && needsGlobalPageNumbering(pdfOptions?.headerTemplate, pdfOptions?.footerTemplate)

  // Reserve the margin/pageSize (so the overlay lines up) but paint nothing yet: the
  // header/footer are stamped globally afterwards via the two-pass overlay.
  const contentPdfOptions = useGlobalPageNumbering
    ? { margin: pdfOptions?.margin, pageSize: pdfOptions?.pageSize }
    : pdfOptions

  const pdfs = await createPDFs(groups, contentPdfOptions, undefined, useGlobalPageNumbering)
  const mergedPdf = await mergePdfs(pdfs) as Uint8Array<ArrayBuffer>

  if (!useGlobalPageNumbering) {
    return mergedPdf
  }

  const pageCount = (await PDFDocument.load(mergedPdf)).getPageCount()
  const overlayPdf = await renderPageNumberOverlay(pageCount, pdfOptions!)

  return await overlayPages(mergedPdf, overlayPdf) as Uint8Array<ArrayBuffer>
}
