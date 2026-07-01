import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

import { HttpError } from './types'

const mocks = vi.hoisted(() => {
  const mockGeneratePDF = vi.fn()
  return { mockGeneratePDF }
})

const FAKE_PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46])

vi.mock('./generate', () => ({ generatePDF: mocks.mockGeneratePDF }))

const getReq = (qs: string) => new NextRequest(`http://localhost/api/gen${qs ? `?${qs}` : ''}`)

const jsonReq = (body: object) =>
  new NextRequest('http://localhost/api/gen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const formReq = (fd: FormData) =>
  new NextRequest('http://localhost/api/gen', { method: 'POST', body: fd })

describe('GET /api/gen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGeneratePDF.mockResolvedValue(FAKE_PDF)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('without params → 400 with message "urls must be provided"', async () => {
    const res = await GET(getReq(''))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/urls/)
  })

  it('with url → generatePDF is called', async () => {
    await GET(getReq('url=https://example.com'))
    expect(mocks.mockGeneratePDF).toHaveBeenCalled()
  })

  it('with url → response status 200', async () => {
    const res = await GET(getReq('url=https://example.com'))
    expect(res.status).toBe(200)
  })

  it('response Content-Type application/pdf', async () => {
    const res = await GET(getReq('url=https://example.com'))
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('with filename → Content-Disposition with name', async () => {
    const res = await GET(getReq('url=https://example.com&filename=out.pdf'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="out.pdf"')
  })

  it('without filename → no Content-Disposition', async () => {
    const res = await GET(getReq('url=https://example.com'))
    expect(res.headers.get('Content-Disposition')).toBeNull()
  })

  it('generatePDF throws HttpError(400) → JSON error status 400', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new HttpError(400, 'Bad input'))
    const res = await GET(getReq('url=https://example.com'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Bad input')
  })

  it('generatePDF throws HttpError(413) → JSON error status 413', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new HttpError(413, 'File too large'))
    const res = await GET(getReq('url=https://example.com'))
    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error).toBe('File too large')
  })

  it('generatePDF throws generic error → 500', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new Error('Crash'))
    const res = await GET(getReq('url=https://example.com'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to generate PDF')
  })

  it('generic error → console.error called', async () => {
    const error = new Error('Crash')
    mocks.mockGeneratePDF.mockRejectedValue(error)
    await GET(getReq('url=https://example.com'))
    expect(console.error).toHaveBeenCalled()
  })

  it('response body matches Uint8Array from generatePDF', async () => {
    const res = await GET(getReq('url=https://example.com'))
    const buffer = await res.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(FAKE_PDF)
  })
})

describe('POST /api/gen — routing Content-Type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGeneratePDF.mockResolvedValue(FAKE_PDF)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('application/json → parseJsonBody path', async () => {
    await POST(jsonReq({ url: 'https://example.com' }))
    expect(mocks.mockGeneratePDF).toHaveBeenCalled()
  })

  it('multipart/form-data → parseFormBody path', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    await POST(formReq(fd))
    expect(mocks.mockGeneratePDF).toHaveBeenCalled()
  })

  it('Content-Type different from json → parseFormBody path', async () => {
    const req = new NextRequest('http://localhost/api/gen', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'url=https%3A%2F%2Fexample.com',
    })
    const res = await POST(req)
    expect(res.status).not.toBe(500)
  })

  it('without Content-Type → parseFormBody path', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    await POST(formReq(fd))
    expect(mocks.mockGeneratePDF).toHaveBeenCalled()
  })
})

describe('POST /api/gen — empty items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGeneratePDF.mockResolvedValue(FAKE_PDF)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('JSON without item keys → 400 with specific message', async () => {
    const res = await POST(jsonReq({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/html/)
    expect(body.error).toMatch(/urls/)
    expect(body.error).toMatch(/files/)
  })

  it('empty FormData → 400 with same message', async () => {
    const res = await POST(formReq(new FormData()))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/html/)
  })
})

describe('POST /api/gen — success', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGeneratePDF.mockResolvedValue(FAKE_PDF)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('JSON with url → generatePDF called → 200', async () => {
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    expect(mocks.mockGeneratePDF).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('Content-Type application/pdf in response', async () => {
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('without filename → Content-Disposition with output.pdf by default', async () => {
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="output.pdf"')
  })

  it('filename in JSON → Content-Disposition with this name', async () => {
    const res = await POST(jsonReq({ url: 'https://example.com', filename: 'rapport.pdf' }))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="rapport.pdf"')
  })

  it('filename in FormData → Content-Disposition with this name', async () => {
    const fd = new FormData()
    fd.append('url', 'https://example.com')
    fd.append('filename', 'rapport.pdf')
    const res = await POST(formReq(fd))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="rapport.pdf"')
  })

  it('response body matches Uint8Array from generatePDF', async () => {
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    const buffer = await res.arrayBuffer()
    expect(new Uint8Array(buffer)).toEqual(FAKE_PDF)
  })
})

describe('POST /api/gen — errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGeneratePDF.mockResolvedValue(FAKE_PDF)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generatePDF throws HttpError(400) → JSON error status 400', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new HttpError(400, 'Bad input'))
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Bad input')
  })

  it('generatePDF throws HttpError(413) → JSON error status 413', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new HttpError(413, 'File too large'))
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    expect(res.status).toBe(413)
  })

  it('generatePDF throws generic error → 500', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new Error('Crash'))
    const res = await POST(jsonReq({ url: 'https://example.com' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to generate PDF')
  })

  it('generic error → console.error called', async () => {
    mocks.mockGeneratePDF.mockRejectedValue(new Error('Crash'))
    await POST(jsonReq({ url: 'https://example.com' }))
    expect(console.error).toHaveBeenCalled()
  })

  it('parseJsonBody throws HttpError (unsupported data URL) → captured as JSON error', async () => {
    const res = await POST(jsonReq({ url: 'data:video/mp4;base64,abc' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('parseFormBody throws HttpError (unsupported file type) → captured as JSON error', async () => {
    const fd = new FormData()
    fd.append('file', new File(['data'], 'archive.zip', { type: 'application/zip' }))
    const res = await POST(formReq(fd))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('parseFormBody throws HttpError(413) for large file → captured', async () => {
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' }))
    const res = await POST(formReq(fd))
    expect(res.status).toBe(413)
  })
})
