import type { NextRequest } from 'next/server'
import type { GenParams, HtmlString, HtmlUrl, ImageUrl, Item, PdfDataUrl, PdfUrl } from './types'
import { Buffer } from 'node:buffer'
import { HttpError, isImageUrl, isPdfDataUrl } from './types'

const MAX_FILE_SIZE = 4 * 1024 * 1024

const ensureArray = <T>(item: T | T[]): T[] => Array.isArray(item) ? item : [item]

const decodePdfDataUrl = (dataUrl: PdfDataUrl): Uint8Array =>
  new Uint8Array(Buffer.from(dataUrl.replace(/^data:application\/pdf;base64,/i, ''), 'base64'))

const processStringItem = (value: string): Item => {
  if (isPdfDataUrl(value)) {
    return decodePdfDataUrl(value)
  }
  if (value.startsWith('data:') && !isImageUrl(value)) {
    throw new HttpError(400, `Unsupported data URL type. Only image and PDF data URLs are accepted.`)
  }
  return value as ImageUrl | PdfUrl | HtmlString | HtmlUrl
}

const processFileItem = async (file: File): Promise<Item> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new HttpError(413, `File "${file.name}" exceeds the 4 MB limit.`)
  }

  if (file.type.startsWith('image/')) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    return `data:${file.type};base64,${base64}` as ImageUrl
  }

  if (file.type === 'application/pdf') {
    return new Uint8Array(await file.arrayBuffer())
  }

  if (file.type === 'text/html') {
    return (await file.text()) as HtmlString
  }

  throw new HttpError(400, `Unsupported file type "${file.type}". Only PDF, image, and HTML files are accepted.`)
}

export const ITEM_KEYS = ['url', 'urls', 'merge', 'file', 'files', 'html'] as const
type ItemKey = typeof ITEM_KEYS[number]
const ITEM_KEY_SET = new Set<string>(ITEM_KEYS)

export const parseGetParams = (request: NextRequest): GenParams => {
  const { searchParams } = request.nextUrl
  return {
    items: ITEM_KEYS.flatMap(key => searchParams.getAll(key)).filter(Boolean).map(processStringItem),
    filename: searchParams.get('filename') || undefined,
  }
}

export const parseJsonBody = async (request: NextRequest): Promise<GenParams> => {
  const body = await request.json() as Partial<Record<ItemKey, string | string[]>> & { filename?: string }

  return {
    filename: body.filename,
    items: ITEM_KEYS.flatMap(key => ensureArray(body[key] ?? [])).map(processStringItem),
  }
}

export const parseFormBody = async (request: NextRequest): Promise<GenParams> => {
  const formData = await request.formData()

  const items = await Promise.all(
    [...formData.entries()]
      .filter(([key, value]) => ITEM_KEY_SET.has(key) && (value instanceof File ? !!value.name : !!value))
      .map(([, value]) => value instanceof File ? processFileItem(value) : processStringItem(value as string)),
  )

  return {
    filename: (formData.get('filename') as string) || undefined,
    items,
  }
}
