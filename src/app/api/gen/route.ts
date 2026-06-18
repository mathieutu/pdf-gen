import type { NextRequest } from 'next/server'
import { generatePDF } from './generate'
import { parseFormBody, parseGetParams, parseJsonBody } from './parsers'
import { HttpError } from './types'

export const maxDuration = 60

const pdfResponse = (pdf: Uint8Array<ArrayBuffer>, filename?: string) =>
  new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      ...(filename && { 'Content-Disposition': `attachment; filename="${filename}"` }),
    },
  })

export const GET = async (request: NextRequest) => {
  const { filename, items } = parseGetParams(request)

  if (!items.length) {
    return Response.json({ error: '\'urls\' must be provided' }, { status: 400 })
  }

  try {
    const pdf = await generatePDF(items)
    return pdfResponse(pdf, filename)
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const { filename, items } = await (
      request.headers.get('content-type')?.includes('application/json')
        ? parseJsonBody(request)
        : parseFormBody(request)
    )

    if (!items.length) {
      return Response.json({ error: 'Either \'html\', \'urls\', or \'files\' must be provided' }, { status: 400 })
    }

    const pdf = await generatePDF(items)
    return pdfResponse(pdf, filename ?? 'output.pdf')
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('Error generating PDF:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
