export type ImageUrl = string & { readonly __type: 'ImageUrl' }
export type PdfDataUrl = string & { readonly __type: 'PdfDataUrl' }
export type PdfUrl = string & { readonly __type: 'PdfUrl' }
export type HtmlString = string & { readonly __type: 'HtmlString' }
export type HtmlUrl = string & { readonly __type: 'HtmlUrl' }

export type Item = ImageUrl | PdfUrl | HtmlString | HtmlUrl | Uint8Array

export type PdfOptions = {
  headerTemplate?: string,
  footerTemplate?: string,
  margin?: { top?: string, bottom?: string, left?: string, right?: string },
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
