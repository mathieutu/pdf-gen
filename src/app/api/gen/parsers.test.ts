import { Buffer } from 'node:buffer'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { parseFormBody, parseGetParams, parseJsonBody } from './parsers'
import { HttpError } from './types'

const PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQ='
const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

const getReq = (qs: string) => new NextRequest(`http://localhost/api/gen${qs ? `?${qs}` : ''}`)

const jsonReq = (body: object) =>
  new NextRequest('http://localhost/api/gen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const formReq = (fd: FormData) =>
  new NextRequest('http://localhost/api/gen', { method: 'POST', body: fd })

describe('parseGetParams', () => {
  it('returns empty items and no filename without params', async () => {
    const result = parseGetParams(getReq(''))
    expect(result).toEqual({ items: [], filename: undefined })
  })

  it('reads url parameter', () => {
    const result = parseGetParams(getReq('url=https://example.com'))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('reads urls parameter', () => {
    const result = parseGetParams(getReq('urls=https://example.com'))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('reads merge parameter', () => {
    const result = parseGetParams(getReq('merge=https://example.com'))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('reads file parameter', () => {
    const result = parseGetParams(getReq('file=https://example.com/doc.pdf'))
    expect(result.items).toEqual(['https://example.com/doc.pdf'])
  })

  it('reads files parameter', () => {
    const result = parseGetParams(getReq('files=https://example.com/doc.pdf'))
    expect(result.items).toEqual(['https://example.com/doc.pdf'])
  })

  it('reads html parameter', () => {
    const result = parseGetParams(getReq('html=%3Cp%3Ehi%3C%2Fp%3E'))
    expect(result.items).toEqual(['<p>hi</p>'])
  })

  it('collects multiple values for the same key', () => {
    const result = parseGetParams(getReq('url=https://a.com&url=https://b.com'))
    expect(result.items).toEqual(['https://a.com', 'https://b.com'])
  })

  it('returns filename when present', () => {
    const result = parseGetParams(getReq('url=https://example.com&filename=out.pdf'))
    expect(result.filename).toBe('out.pdf')
  })

  it('returns undefined for missing filename', () => {
    const result = parseGetParams(getReq('url=https://example.com'))
    expect(result.filename).toBeUndefined()
  })

  it('returns undefined for empty filename', () => {
    const result = parseGetParams(getReq('url=https://example.com&filename='))
    expect(result.filename).toBeUndefined()
  })

  it('decodes PDF data URL to Uint8Array', () => {
    const result = parseGetParams(getReq(`url=${encodeURIComponent(PDF_DATA_URL)}`))
    expect(result.items[0]).toBeInstanceOf(Uint8Array)
  })

  it('Uint8Array content matches decoded base64', () => {
    const result = parseGetParams(getReq(`url=${encodeURIComponent(PDF_DATA_URL)}`))
    const expected = new Uint8Array(Buffer.from('JVBERi0xLjQ=', 'base64'))
    expect(result.items[0]).toEqual(expected)
  })

  it('throws HttpError(400) for unsupported data URL', () => {
    expect(() => parseGetParams(getReq('url=data:text/plain;base64,abc'))).toThrow(HttpError)
    expect(() => parseGetParams(getReq('url=data:text/plain;base64,abc'))).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('lets image data URL pass as string', () => {
    const result = parseGetParams(getReq(`url=${encodeURIComponent(IMAGE_DATA_URL)}`))
    expect(result.items[0]).toBe(IMAGE_DATA_URL)
  })

  it('filters empty values', () => {
    const result = parseGetParams(getReq('url=&url=https://a.com'))
    expect(result.items).toEqual(['https://a.com'])
  })

  it('respects ITEM_KEYS order (url before html)', () => {
    const result = parseGetParams(getReq('html=%3Cp%3E&url=https://a.com'))
    expect(result.items[0]).toBe('https://a.com')
    expect(result.items[1]).toBe('<p>')
  })

  it('returns undefined pdfOptions when none provided', () => {
    const result = parseGetParams(getReq('url=https://example.com'))
    expect(result.pdfOptions).toBeUndefined()
  })

  it('reads pdfOptions.headerTemplate dotted notation', () => {
    const result = parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.headerTemplate')}=${encodeURIComponent('<div>header</div>')}`))
    expect(result.pdfOptions).toEqual({ headerTemplate: '<div>header</div>' })
  })

  it('reads pdfOptions.footerTemplate dotted notation', () => {
    const result = parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.footerTemplate')}=${encodeURIComponent('<div>footer</div>')}`))
    expect(result.pdfOptions).toEqual({ footerTemplate: '<div>footer</div>' })
  })

  it('reads pdfOptions.margin.* dotted notation', () => {
    const qs = ['top', 'bottom', 'left', 'right']
      .map(side => `${encodeURIComponent(`pdfOptions.margin.${side}`)}=20mm`)
      .join('&')
    const result = parseGetParams(getReq(`url=https://example.com&${qs}`))
    expect(result.pdfOptions).toEqual({ margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } })
  })

  it('partial margin fields only include provided sides', () => {
    const result = parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.margin.top')}=10mm`))
    expect(result.pdfOptions).toEqual({ margin: { top: '10mm' } })
  })

  it('throws HttpError(400) for invalid margin value', () => {
    expect(() => parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.margin.top')}=notalength`))).toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('reads pdfOptions.pageSize.format dotted notation', () => {
    const result = parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.pageSize.format')}=letter`))
    expect(result.pdfOptions).toEqual({ pageSize: { format: 'letter' } })
  })

  it('reads pdfOptions.pageSize.width/height dotted notation', () => {
    const qs = [`${encodeURIComponent('pdfOptions.pageSize.width')}=100mm`, `${encodeURIComponent('pdfOptions.pageSize.height')}=150mm`].join('&')
    const result = parseGetParams(getReq(`url=https://example.com&${qs}`))
    expect(result.pdfOptions).toEqual({ pageSize: { width: '100mm', height: '150mm' } })
  })

  it('reads pdfOptions.pageSize.landscape=true dotted notation as boolean true', () => {
    const result = parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.pageSize.landscape')}=true`))
    expect(result.pdfOptions).toEqual({ pageSize: { landscape: true } })
  })

  it('reads pdfOptions.pageSize.landscape=false dotted notation as boolean false', () => {
    const result = parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.pageSize.landscape')}=false`))
    expect(result.pdfOptions).toEqual({ pageSize: { landscape: false } })
  })

  it('throws HttpError(400) for invalid pageSize.format value', () => {
    expect(() => parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.pageSize.format')}=invalid`))).toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('throws HttpError(400) when pageSize.width is provided without height', () => {
    expect(() => parseGetParams(getReq(`url=https://example.com&${encodeURIComponent('pdfOptions.pageSize.width')}=100mm`))).toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })
})

describe('parseJsonBody', () => {
  it('returns empty items for empty body', async () => {
    const result = await parseJsonBody(jsonReq({}))
    expect(result).toEqual({ items: [], filename: undefined })
  })

  it('wraps single url string in array', async () => {
    const result = await parseJsonBody(jsonReq({ url: 'https://example.com' }))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('supports urls in array', async () => {
    const result = await parseJsonBody(jsonReq({ urls: ['https://a.com', 'https://b.com'] }))
    expect(result.items).toEqual(['https://a.com', 'https://b.com'])
  })

  it('wraps single urls string via ensureArray', async () => {
    const result = await parseJsonBody(jsonReq({ urls: 'https://example.com' }))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('reads html parameter', async () => {
    const result = await parseJsonBody(jsonReq({ html: '<p>hi</p>' }))
    expect(result.items).toEqual(['<p>hi</p>'])
  })

  it('reads merge parameter', async () => {
    const result = await parseJsonBody(jsonReq({ merge: 'https://example.com/doc.pdf' }))
    expect(result.items).toEqual(['https://example.com/doc.pdf'])
  })

  it('reads file parameter', async () => {
    const result = await parseJsonBody(jsonReq({ file: 'https://example.com/doc.pdf' }))
    expect(result.items).toEqual(['https://example.com/doc.pdf'])
  })

  it('reads files parameter', async () => {
    const result = await parseJsonBody(jsonReq({ files: 'https://example.com/doc.pdf' }))
    expect(result.items).toEqual(['https://example.com/doc.pdf'])
  })

  it('returns filename', async () => {
    const result = await parseJsonBody(jsonReq({ filename: 'out.pdf', url: 'https://a.com' }))
    expect(result.filename).toBe('out.pdf')
  })

  it('returns undefined for missing filename', async () => {
    const result = await parseJsonBody(jsonReq({ url: 'https://a.com' }))
    expect(result.filename).toBeUndefined()
  })

  it('missing key produces empty array via ?? []', async () => {
    const result = await parseJsonBody(jsonReq({}))
    expect(result.items).toEqual([])
  })

  it('null value produces empty array via ?? []', async () => {
    const result = await parseJsonBody(jsonReq({ url: null }))
    expect(result.items).toEqual([])
  })

  it('decodes PDF data URL to Uint8Array', async () => {
    const result = await parseJsonBody(jsonReq({ url: PDF_DATA_URL }))
    expect(result.items[0]).toBeInstanceOf(Uint8Array)
  })

  it('throws HttpError(400) for unsupported data URL', async () => {
    await expect(parseJsonBody(jsonReq({ url: 'data:video/mp4;base64,abc' }))).rejects.toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('lets image data URL pass as string', async () => {
    const result = await parseJsonBody(jsonReq({ url: IMAGE_DATA_URL }))
    expect(result.items[0]).toBe(IMAGE_DATA_URL)
  })

  it('combines multiple keys into single items array', async () => {
    const result = await parseJsonBody(jsonReq({ url: 'https://a.com', html: '<p>hi</p>' }))
    expect(result.items).toHaveLength(2)
    expect(result.items).toContain('https://a.com')
    expect(result.items).toContain('<p>hi</p>')
  })

  it('returns undefined pdfOptions when none provided', async () => {
    const result = await parseJsonBody(jsonReq({ url: 'https://a.com' }))
    expect(result.pdfOptions).toBeUndefined()
  })

  it('passes pdfOptions through as a native object', async () => {
    const pdfOptions = { headerTemplate: '<div>h</div>', footerTemplate: '<div>f</div>', margin: { top: '20mm', bottom: '16mm', left: '14mm', right: '14mm' } }
    const result = await parseJsonBody(jsonReq({ url: 'https://a.com', pdfOptions }))
    expect(result.pdfOptions).toEqual(pdfOptions)
  })

  it('throws HttpError(400) for invalid margin value in pdfOptions', async () => {
    await expect(parseJsonBody(jsonReq({ url: 'https://a.com', pdfOptions: { margin: { top: 'notalength' } } }))).rejects.toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('passes pdfOptions.pageSize through as a native object', async () => {
    const pdfOptions = { pageSize: { format: 'letter' as const, landscape: true } }
    const result = await parseJsonBody(jsonReq({ url: 'https://a.com', pdfOptions }))
    expect(result.pdfOptions).toEqual(pdfOptions)
  })

  it('throws HttpError(400) for invalid pageSize.format in pdfOptions', async () => {
    await expect(parseJsonBody(jsonReq({ url: 'https://a.com', pdfOptions: { pageSize: { format: 'invalid' } } }))).rejects.toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('throws HttpError(400) when pageSize.height is provided without width', async () => {
    await expect(parseJsonBody(jsonReq({ url: 'https://a.com', pdfOptions: { pageSize: { height: '100mm' } } }))).rejects.toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })
})

describe('parseFormBody', () => {
  it('returns empty items for empty FormData', async () => {
    const result = await parseFormBody(formReq(new FormData()))
    expect(result).toEqual({ items: [], filename: undefined })
  })

  it('reads string url field', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    const result = await parseFormBody(formReq(fd))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('reads string html field', async () => {
    const fd = new FormData()
    fd.append('html', '<p>hi</p>')
    const result = await parseFormBody(formReq(fd))
    expect(result.items).toEqual(['<p>hi</p>'])
  })

  it('returns filename', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('filename', 'out.pdf')
    const result = await parseFormBody(formReq(fd))
    expect(result.filename).toBe('out.pdf')
  })

  it('returns undefined for empty filename', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('filename', '')
    const result = await parseFormBody(formReq(fd))
    expect(result.filename).toBeUndefined()
  })

  it('ignores unknown keys', async () => {
    const fd = new FormData()
    fd.append('title', 'My title')
    fd.append('url', 'https://example.com')
    const result = await parseFormBody(formReq(fd))
    expect(result.items).toEqual(['https://example.com'])
  })

  it('File image/png → base64 data URL', async () => {
    const content = new Uint8Array([137, 80, 78, 71])
    const fd = new FormData()
    fd.append('file', new File([content], 'photo.png', { type: 'image/png' }))
    const result = await parseFormBody(formReq(fd))
    expect(typeof result.items[0]).toBe('string')
    expect(result.items[0]).toMatch(/^data:image\/png;base64,/)
  })

  it('File image/jpeg → base64 data URL', async () => {
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array([255, 216])], 'photo.jpg', { type: 'image/jpeg' }))
    const result = await parseFormBody(formReq(fd))
    expect(result.items[0]).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('File application/pdf → Uint8Array with correct content', async () => {
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const fd = new FormData()
    fd.append('file', new File([content], 'doc.pdf', { type: 'application/pdf' }))
    const result = await parseFormBody(formReq(fd))
    expect(result.items[0]).toBeInstanceOf(Uint8Array)
    expect(result.items[0]).toEqual(content)
  })

  it('File text/html → HtmlString with correct content', async () => {
    const htmlContent = '<p>Hello</p>'
    const fd = new FormData()
    fd.append('file', new File([htmlContent], 'page.html', { type: 'text/html' }))
    const result = await parseFormBody(formReq(fd))
    expect(result.items[0]).toBe(htmlContent)
  })

  it('File > 4 MB throws HttpError(413)', async () => {
    const bigContent = new Uint8Array(4 * 1024 * 1024 + 1)
    const fd = new FormData()
    fd.append('file', new File([bigContent], 'big.pdf', { type: 'application/pdf' }))
    await expect(parseFormBody(formReq(fd))).rejects.toThrow(expect.objectContaining({ status: 413 }))
  })

  it('File exactly 4 MB is accepted (condition strictly >)', async () => {
    const exactContent = new Uint8Array(4 * 1024 * 1024)
    const fd = new FormData()
    fd.append('file', new File([exactContent], 'exact.pdf', { type: 'application/pdf' }))
    const result = await parseFormBody(formReq(fd))
    expect(result.items[0]).toBeInstanceOf(Uint8Array)
  })

  it('File unsupported type throws HttpError(400) with type in message', async () => {
    const fd = new FormData()
    fd.append('file', new File(['data'], 'archive.zip', { type: 'application/zip' }))
    await expect(parseFormBody(formReq(fd))).rejects.toThrow(expect.objectContaining({ status: 400 }))
    await expect(parseFormBody(formReq(fd))).rejects.toThrow('application/zip')
  })

  it('empty string for item key is filtered', async () => {
    const fd = new FormData()
    fd.append('url', '')
    fd.append('url', 'https://example.com')
    const result = await parseFormBody(formReq(fd))
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toBe('https://example.com')
  })

  it('mixes File and string in same FormData', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('file', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'doc.pdf', { type: 'application/pdf' }))
    const result = await parseFormBody(formReq(fd))
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toBe('https://example.com')
    expect(result.items[1]).toBeInstanceOf(Uint8Array)
  })

  it('PDF data URL in string field → Uint8Array', async () => {
    const fd = new FormData()
    fd.append('url', PDF_DATA_URL)
    const result = await parseFormBody(formReq(fd))
    expect(result.items[0]).toBeInstanceOf(Uint8Array)
  })

  it('unsupported data URL in string field → HttpError(400)', async () => {
    const fd = new FormData()
    fd.append('url', 'data:video/mp4;base64,abc')
    await expect(parseFormBody(formReq(fd))).rejects.toThrow(expect.objectContaining({ status: 400 }))
  })

  it('returns undefined pdfOptions when none provided', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    const result = await parseFormBody(formReq(fd))
    expect(result.pdfOptions).toBeUndefined()
  })

  it('reads pdfOptions.headerTemplate/.footerTemplate dotted notation', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('pdfOptions.headerTemplate', '<div>header</div>')
    fd.append('pdfOptions.footerTemplate', '<div>footer</div>')
    const result = await parseFormBody(formReq(fd))
    expect(result.pdfOptions).toEqual({ headerTemplate: '<div>header</div>', footerTemplate: '<div>footer</div>' })
  })

  it('reads pdfOptions.margin.* dotted notation', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('pdfOptions.margin.top', '20mm')
    fd.append('pdfOptions.margin.bottom', '16mm')
    fd.append('pdfOptions.margin.left', '14mm')
    fd.append('pdfOptions.margin.right', '14mm')
    const result = await parseFormBody(formReq(fd))
    expect(result.pdfOptions).toEqual({ margin: { top: '20mm', bottom: '16mm', left: '14mm', right: '14mm' } })
  })

  it('throws HttpError(400) for invalid margin value', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('pdfOptions.margin.top', 'notalength')
    await expect(parseFormBody(formReq(fd))).rejects.toThrow(expect.objectContaining({ status: 400 }))
  })

  it('reads pdfOptions.pageSize.* dotted notation', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('pdfOptions.pageSize.format', 'legal')
    fd.append('pdfOptions.pageSize.landscape', 'true')
    const result = await parseFormBody(formReq(fd))
    expect(result.pdfOptions).toEqual({ pageSize: { format: 'legal', landscape: true } })
  })

  it('throws HttpError(400) for invalid pageSize.format value', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('pdfOptions.pageSize.format', 'invalid')
    await expect(parseFormBody(formReq(fd))).rejects.toThrow(expect.objectContaining({ status: 400 }))
  })
})
