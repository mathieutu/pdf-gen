export type ImageUrl = string & { readonly __type: 'ImageUrl' }
export type PdfDataUrl = string & { readonly __type: 'PdfDataUrl' }
export type PdfUrl = string & { readonly __type: 'PdfUrl' }
export type HtmlString = string & { readonly __type: 'HtmlString' }
export type HtmlUrl = string & { readonly __type: 'HtmlUrl' }

export type Item = ImageUrl | PdfUrl | HtmlString | HtmlUrl | Uint8Array

export type PageFormat = 'a4' | 'letter' | 'legal' | 'tabloid' | 'ledger' | 'a3' | 'a5' | 'a6'

export type PdfOptions = {
  headerTemplate?: string,
  footerTemplate?: string,
  margin?: { top?: string, bottom?: string, left?: string, right?: string },
  pageSize?: { format?: PageFormat, width?: string, height?: string, landscape?: boolean },
}

export type GenParams = { items: Item[], filename?: string, pdfOptions?: PdfOptions }

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export const isImageUrl = (item: unknown): item is ImageUrl =>
  typeof item === 'string' && (/^data:image\//i.test(item) || /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i.test(item))

export const isPdfUrl = (item: unknown): item is PdfUrl =>
  typeof item === 'string' && /\.pdf(?:\?.*)?$/i.test(item)

export const isPdfDataUrl = (item: unknown): item is PdfDataUrl =>
  typeof item === 'string' && /^data:application\/pdf;base64,/i.test(item)

export const isHtmlString = (item: unknown): item is HtmlString =>
  typeof item === 'string' && item.trimStart().startsWith('<')

const CSS_LENGTH_REGEX = /^\d+(?:\.\d+)?(?:px|in|cm|mm)?$/i

export const isValidCssLength = (value: string): boolean => CSS_LENGTH_REGEX.test(value)

export const validateMargin = (margin: PdfOptions['margin']): void => {
  if (!margin) return

  for (const [side, value] of Object.entries(margin)) {
    if (value !== undefined && !isValidCssLength(value)) {
      throw new HttpError(400, `Invalid pdfOptions.margin.${side} value "${value}". Expected a CSS length (e.g. "20mm", "1in", "16px").`)
    }
  }
}

const PAGE_FORMATS = new Set<PageFormat>(['a4', 'letter', 'legal', 'tabloid', 'ledger', 'a3', 'a5', 'a6'])

export const validatePageSize = (pageSize: PdfOptions['pageSize']): void => {
  if (!pageSize) return

  const { format, width, height } = pageSize

  if (format !== undefined && !PAGE_FORMATS.has(format)) {
    throw new HttpError(400, `Invalid pdfOptions.pageSize.format value "${format}". Expected one of: ${[...PAGE_FORMATS].join(', ')}.`)
  }

  for (const [side, value] of [['width', width], ['height', height]] as const) {
    if (value !== undefined && !isValidCssLength(value)) {
      throw new HttpError(400, `Invalid pdfOptions.pageSize.${side} value "${value}". Expected a CSS length (e.g. "20mm", "1in", "16px").`)
    }
  }

  if ((width === undefined) !== (height === undefined)) {
    throw new HttpError(400, `pdfOptions.pageSize.width and pdfOptions.pageSize.height must be provided together.`)
  }
}
