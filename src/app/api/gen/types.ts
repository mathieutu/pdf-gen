export type ImageUrl = string & { readonly __type: 'ImageUrl' }
export type PdfDataUrl = string & { readonly __type: 'PdfDataUrl' }
export type PdfUrl = string & { readonly __type: 'PdfUrl' }
export type HtmlString = string & { readonly __type: 'HtmlString' }
export type HtmlUrl = string & { readonly __type: 'HtmlUrl' }

export type Item = ImageUrl | PdfUrl | HtmlString | HtmlUrl | Uint8Array

export type GenParams = { items: Item[], filename?: string }

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
