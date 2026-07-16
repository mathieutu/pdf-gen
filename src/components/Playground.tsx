'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useRef, useState } from 'react'
import { EXAMPLE_FILENAME, EXAMPLE_FOOTER_TEMPLATE, EXAMPLE_HEADER_TEMPLATE, EXAMPLE_HTML, EXAMPLE_HTML_URL, EXAMPLE_IMAGE_URL, EXAMPLE_MARGIN, EXAMPLE_PDF_URL } from '@/lib/examples'

const inputCls = `
  w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
  text-gray-900 shadow-sm placeholder:text-gray-400
  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
  dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500
  dark:focus:border-blue-400 dark:focus:ring-blue-400
`

type MergeItem = { id: string } & ({ type: 'url', value: string } | { type: 'file' })

const ClearButton = (props: ComponentPropsWithoutRef<'button'>) => (
  <button
    type="button"
    aria-label="Clear"
    className="
      ml-1 text-xs font-normal text-gray-400
      hover:text-gray-600 hover:underline
      dark:hover:text-gray-200
    "
    {...props}
  >
    Clear
  </button>
)

export const Playground = () => {
  const [method, setMethod] = useState<'GET' | 'POST'>('POST')
  const [mergeItems, setMergeItems] = useState<MergeItem[]>(() => [
    { id: crypto.randomUUID(), type: 'url', value: EXAMPLE_HTML_URL },
    { id: crypto.randomUUID(), type: 'url', value: EXAMPLE_IMAGE_URL },
    { id: crypto.randomUUID(), type: 'url', value: EXAMPLE_PDF_URL },
  ])

  const htmlRef = useRef<HTMLTextAreaElement>(null)
  const filenameRef = useRef<HTMLInputElement>(null)
  const headerTemplateRef = useRef<HTMLTextAreaElement>(null)
  const footerTemplateRef = useRef<HTMLTextAreaElement>(null)
  const marginTopRef = useRef<HTMLInputElement>(null)
  const marginBottomRef = useRef<HTMLInputElement>(null)
  const marginLeftRef = useRef<HTMLInputElement>(null)
  const marginRightRef = useRef<HTMLInputElement>(null)
  const marginRefBySide = { top: marginTopRef, bottom: marginBottomRef, left: marginLeftRef, right: marginRightRef }
  const pageSizeFormatRef = useRef<HTMLSelectElement>(null)
  const pageSizeLandscapeRef = useRef<HTMLInputElement>(null)

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const labelWithClearCls = `${labelCls} flex w-full items-center justify-between`

  return (
    <section className="print:hidden">
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div>
          <h2 className="
            text-2xl font-extrabold tracking-tight text-gray-900
            sm:text-3xl
            dark:text-white
          "
          >
            Playground
          </h2>
          <p className="
            mt-4 text-base text-gray-500
            dark:text-gray-400
          "
          >
            Try the API directly from your browser.
          </p>
        </div>
        <div className="
          mt-12
          lg:col-span-2 lg:mt-0
        "
        >
          <form
            action="/api/gen"
            method={method}
            encType={method === 'POST' ? 'multipart/form-data' : undefined}
            target="_blank"
            className="
              space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-6
              dark:border-gray-700 dark:bg-gray-900
            "
          >
            {/* Method */}
            <fieldset>
              <legend className={labelCls}>Method</legend>
              <div className="flex gap-6">
                {(['GET', 'POST'] as const).map(m => (
                  <label
                    key={m}
                    className="
                      flex cursor-pointer items-center gap-2 text-sm
                      text-gray-700
                      dark:text-gray-300
                    "
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                      className="accent-blue-600"
                    />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* HTML — POST only */}
            {method === 'POST' && (
              <div>
                <label className={labelWithClearCls}>
                  <span>
                    HTML
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </span>
                  <ClearButton onClick={() => {
                    if (htmlRef.current) htmlRef.current.value = ''
                  }}
                  />
                </label>
                <textarea
                  ref={htmlRef}
                  name="html"
                  defaultValue={EXAMPLE_HTML}
                  placeholder="<html><body>Hello world</body></html>"
                  rows={5}
                  className={`
                    ${inputCls}
                    resize-y font-mono text-xs
                  `}
                />
              </div>
            )}

            {/* URLs & Files */}
            <div>
              <p className={labelCls}>
                Urls & Files
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </p>
              <div className="space-y-2">
                {mergeItems.map(item => (
                  <div key={item.id} className="flex gap-2">
                    {item.type === 'url'
                      ? (
                          <input
                            type="url"
                            name="url"
                            value={item.value}
                            onChange={e => setMergeItems(curr => curr.map(val => val.id === item.id ? { id: item.id, type: 'url', value: e.target.value } : val))}
                            placeholder="https://example.com/doc.pdf"
                            className={inputCls}
                          />
                        )
                      : (
                          <input
                            type="file"
                            name="file"
                            accept=".pdf,.html,text/html,image/*"
                            className={`
                              ${inputCls}
                              file:mr-2 file:rounded-sm file:border-0
                              file:bg-gray-200 file:px-2 file:py-1 file:text-xs
                              file:text-gray-700
                              dark:file:bg-gray-700 dark:file:text-gray-300
                            `}
                          />
                        )}
                    {mergeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMergeItems(curr => curr.filter(val => val.id !== item.id))}
                        className="
                          shrink-0 rounded-md border border-gray-300 px-3 py-2
                          text-sm text-gray-600
                          hover:bg-gray-100
                          dark:border-gray-600 dark:text-gray-400
                          dark:hover:bg-gray-800
                        "
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setMergeItems(curr => [...curr, { id: crypto.randomUUID(), type: 'url', value: '' }])}
                    className="
                      text-sm text-blue-600
                      hover:underline
                      dark:text-blue-400
                    "
                  >
                    + Add URL
                  </button>
                  {method === 'POST' && (
                    <button
                      type="button"
                      onClick={() => setMergeItems(curr => [...curr, { id: crypto.randomUUID(), type: 'file' }])}
                      className="
                        text-sm text-blue-600
                        hover:underline
                        dark:text-blue-400
                      "
                    >
                      + Add File
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filename — POST only */}
            {method === 'POST' && (
              <div>
                <label className={labelWithClearCls}>
                  <span>
                    Filename
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </span>
                  <ClearButton onClick={() => {
                    if (filenameRef.current) filenameRef.current.value = ''
                  }}
                  />
                </label>
                <input
                  ref={filenameRef}
                  type="text"
                  name="filename"
                  defaultValue={EXAMPLE_FILENAME}
                  placeholder="output.pdf"
                  className={inputCls}
                />
              </div>
            )}

            {/* Header template — POST only */}
            {method === 'POST' && (
              <div>
                <label className={labelWithClearCls}>
                  <span>
                    Header template
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </span>
                  <ClearButton onClick={() => {
                    if (headerTemplateRef.current) headerTemplateRef.current.value = ''
                  }}
                  />
                </label>
                <textarea
                  ref={headerTemplateRef}
                  name="pdfOptions.headerTemplate"
                  defaultValue={EXAMPLE_HEADER_TEMPLATE}
                  placeholder="<div>My Company</div>"
                  rows={3}
                  className={`
                    ${inputCls}
                    resize-y font-mono text-xs
                  `}
                />
              </div>
            )}

            {/* Footer template — POST only */}
            {method === 'POST' && (
              <div>
                <label className={labelWithClearCls}>
                  <span>
                    Footer template
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </span>
                  <ClearButton onClick={() => {
                    if (footerTemplateRef.current) footerTemplateRef.current.value = ''
                  }}
                  />
                </label>
                <textarea
                  ref={footerTemplateRef}
                  name="pdfOptions.footerTemplate"
                  defaultValue={EXAMPLE_FOOTER_TEMPLATE}
                  placeholder='<div>Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>'
                  rows={3}
                  className={`
                    ${inputCls}
                    resize-y font-mono text-xs
                  `}
                />
              </div>
            )}

            {/* Margin */}
            <fieldset>
              <legend className={labelWithClearCls}>
                <span>
                  Margin
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </span>
                <ClearButton
                  onClick={() => {
                    for (const ref of Object.values(marginRefBySide)) {
                      if (ref.current) ref.current.value = ''
                    }
                  }}
                />
              </legend>
              <div className="
                grid grid-cols-2 gap-2
                sm:grid-cols-4
              "
              >
                {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                  <input
                    key={side}
                    ref={marginRefBySide[side]}
                    type="text"
                    name={`pdfOptions.margin.${side}`}
                    defaultValue={EXAMPLE_MARGIN[side]}
                    placeholder={side}
                    aria-label={`Margin ${side}`}
                    className={inputCls}
                  />
                ))}
              </div>
            </fieldset>

            {/* Page size */}
            <fieldset>
              <legend className={labelWithClearCls}>
                <span>
                  Page size
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </span>
                <ClearButton
                  onClick={() => {
                    if (pageSizeFormatRef.current) pageSizeFormatRef.current.value = ''
                    if (pageSizeLandscapeRef.current) pageSizeLandscapeRef.current.checked = false
                  }}
                />
              </legend>
              <div className="space-y-2">
                <select ref={pageSizeFormatRef} name="pdfOptions.pageSize.format" defaultValue="" className={inputCls}>
                  <option value="">Default (a4)</option>
                  {(['a4', 'letter', 'legal', 'tabloid', 'ledger', 'a3', 'a5', 'a6'] as const).map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
                <label className="
                  flex cursor-pointer items-center gap-2 text-sm text-gray-700
                  dark:text-gray-300
                "
                >
                  <input
                    ref={pageSizeLandscapeRef}
                    type="checkbox"
                    name="pdfOptions.pageSize.landscape"
                    value="true"
                    className="accent-blue-600"
                  />
                  Landscape
                </label>
              </div>
            </fieldset>

            <button
              type="submit"
              className="
                rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white
                shadow-sm
                hover:opacity-70
                dark:bg-white dark:text-black
              "
            >
              Generate PDF
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
