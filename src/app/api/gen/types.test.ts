import { describe, expect, it } from 'vitest'
import { HttpError, isHtmlString, isImageUrl, isPdfDataUrl, isPdfUrl } from './types'

describe('isImageUrl', () => {
  it('returns false for number', () => expect(isImageUrl(42)).toBe(false))
  it('returns false for null', () => expect(isImageUrl(null)).toBe(false))
  it('returns false for undefined', () => expect(isImageUrl(undefined)).toBe(false))
  it('returns false for object', () => expect(isImageUrl({})).toBe(false))
  it('returns false for empty string', () => expect(isImageUrl('')).toBe(false))

  it('returns true for data:image/png;base64,...', () => expect(isImageUrl('data:image/png;base64,abc')).toBe(true))
  it('returns true for data:image/jpeg;base64,...', () => expect(isImageUrl('data:image/jpeg;base64,abc')).toBe(true))
  it('returns true for data:image/gif;base64,...', () => expect(isImageUrl('data:image/gif;base64,abc')).toBe(true))
  it('returns true for data:image/webp;base64,...', () => expect(isImageUrl('data:image/webp;base64,abc')).toBe(true))
  it('returns true for data:image/svg+xml;base64,...', () => expect(isImageUrl('data:image/svg+xml;base64,abc')).toBe(true))
  it('data:image/ prefix case-insensitive', () => expect(isImageUrl('DATA:IMAGE/PNG;base64,abc')).toBe(true))

  it('returns true for .png', () => expect(isImageUrl('https://example.com/photo.png')).toBe(true))
  it('returns true for .jpg', () => expect(isImageUrl('https://example.com/photo.jpg')).toBe(true))
  it('returns true for .jpeg', () => expect(isImageUrl('https://example.com/photo.jpeg')).toBe(true))
  it('returns true for .gif', () => expect(isImageUrl('https://example.com/photo.gif')).toBe(true))
  it('returns true for .webp', () => expect(isImageUrl('https://example.com/photo.webp')).toBe(true))
  it('returns true for .bmp', () => expect(isImageUrl('https://example.com/photo.bmp')).toBe(true))
  it('returns true for .svg', () => expect(isImageUrl('https://example.com/photo.svg')).toBe(true))
  it('extension case-insensitive .PNG', () => expect(isImageUrl('https://example.com/photo.PNG')).toBe(true))
  it('extension case-insensitive .JPG', () => expect(isImageUrl('https://example.com/photo.JPG')).toBe(true))
  it('extension with query string', () => expect(isImageUrl('https://example.com/photo.jpg?w=800')).toBe(true))
  it('extension with multi-param query string', () => expect(isImageUrl('https://example.com/photo.jpg?w=800&h=600')).toBe(true))

  it('returns false for .pdf', () => expect(isImageUrl('https://example.com/doc.pdf')).toBe(false))
  it('returns false for .html', () => expect(isImageUrl('https://example.com/page.html')).toBe(false))
  it('returns false for data:application/pdf;base64,...', () => expect(isImageUrl('data:application/pdf;base64,abc')).toBe(false))
  it('returns false for URL without extension', () => expect(isImageUrl('https://example.com/image')).toBe(false))
  it('returns false for .jpg in path but not at end', () => expect(isImageUrl('https://example.com/jpg-converter/file.pdf')).toBe(false))
})

describe('isPdfUrl', () => {
  it('returns false for number', () => expect(isPdfUrl(42)).toBe(false))
  it('returns false for null', () => expect(isPdfUrl(null)).toBe(false))
  it('returns false for undefined', () => expect(isPdfUrl(undefined)).toBe(false))

  it('returns true for doc.pdf', () => expect(isPdfUrl('doc.pdf')).toBe(true))
  it('returns true for https URL with .pdf', () => expect(isPdfUrl('https://example.com/report.pdf')).toBe(true))
  it('returns true with query string', () => expect(isPdfUrl('file.pdf?v=1')).toBe(true))
  it('case-insensitive .PDF', () => expect(isPdfUrl('doc.PDF')).toBe(true))
  it('case-insensitive .Pdf', () => expect(isPdfUrl('doc.Pdf')).toBe(true))

  it('returns false for .pdff', () => expect(isPdfUrl('doc.pdff')).toBe(false))
  it('returns false for .xpdf', () => expect(isPdfUrl('doc.xpdf')).toBe(false))
  it('returns false for PDF data URL', () => expect(isPdfUrl('data:application/pdf;base64,abc')).toBe(false))
  it('returns false for .jpg', () => expect(isPdfUrl('doc.jpg')).toBe(false))
  it('returns false for .html', () => expect(isPdfUrl('page.html')).toBe(false))
})

describe('isPdfDataUrl', () => {
  it('returns false for number', () => expect(isPdfDataUrl(42)).toBe(false))
  it('returns false for null', () => expect(isPdfDataUrl(null)).toBe(false))
  it('returns false for undefined', () => expect(isPdfDataUrl(undefined)).toBe(false))

  it('returns true for data:application/pdf;base64,...', () => expect(isPdfDataUrl('data:application/pdf;base64,JVBERi0xLjQ=')).toBe(true))
  it('case-insensitive', () => expect(isPdfDataUrl('DATA:APPLICATION/PDF;BASE64,JVBERi0=')).toBe(true))

  it('returns false if missing base64,', () => expect(isPdfDataUrl('data:application/pdf;')).toBe(false))
  it('returns false if no ;base64,', () => expect(isPdfDataUrl('data:application/pdf')).toBe(false))
  it('returns false for .pdf URL', () => expect(isPdfDataUrl('https://example.com/doc.pdf')).toBe(false))
  it('returns false for data:image/png;base64,...', () => expect(isPdfDataUrl('data:image/png;base64,abc')).toBe(false))
})

describe('isHtmlString', () => {
  it('returns false for number', () => expect(isHtmlString(42)).toBe(false))
  it('returns false for null', () => expect(isHtmlString(null)).toBe(false))
  it('returns false for undefined', () => expect(isHtmlString(undefined)).toBe(false))
  it('returns false for empty string', () => expect(isHtmlString('')).toBe(false))

  it('returns true for <html>...</html>', () => expect(isHtmlString('<html><body>test</body></html>')).toBe(true))
  it('returns true for <div>hello</div>', () => expect(isHtmlString('<div>hello</div>')).toBe(true))
  it('returns true for <!DOCTYPE html>', () => expect(isHtmlString('<!DOCTYPE html><html></html>')).toBe(true))
  it('returns true with whitespace before <', () => expect(isHtmlString('   <html>')).toBe(true))
  it('returns true with tabs and newlines before <', () => expect(isHtmlString('\n\t<html>')).toBe(true))

  it('returns false for URL', () => expect(isHtmlString('https://example.com')).toBe(false))
  it('returns false for plain text', () => expect(isHtmlString('plain text')).toBe(false))
  it('returns false for data:text/html;...', () => expect(isHtmlString('data:text/html;base64,abc')).toBe(false))
})

describe('error class HttpError', () => {
  it('is an instance of Error', () => {
    expect(new HttpError(400, 'Bad Request')).toBeInstanceOf(Error)
  })

  it('stores status 400', () => {
    expect(new HttpError(400, 'Bad Request').status).toBe(400)
  })

  it('stores status 413', () => {
    expect(new HttpError(413, 'Payload Too Large').status).toBe(413)
  })

  it('stores status 500', () => {
    expect(new HttpError(500, 'Server Error').status).toBe(500)
  })

  it('stores message', () => {
    expect(new HttpError(400, 'Bad Request').message).toBe('Bad Request')
  })
})
