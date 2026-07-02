'use client'

import { useState } from 'react'
import { EXAMPLE_FILENAME, EXAMPLE_HTML, EXAMPLE_HTML_URL, EXAMPLE_IMAGE_URL, EXAMPLE_PDF_URL } from '@/lib/examples'

const inputCls = `
  w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
  text-gray-900 shadow-sm placeholder:text-gray-400
  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
  dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500
  dark:focus:border-blue-400 dark:focus:ring-blue-400
`

type MergeItem = { id: string } & ({ type: 'url', value: string } | { type: 'file' })

export const Playground = () => {
  const [method, setMethod] = useState<'GET' | 'POST'>('POST')
  const [mergeItems, setMergeItems] = useState<MergeItem[]>(() => [
    { id: crypto.randomUUID(), type: 'url', value: EXAMPLE_HTML_URL },
    { id: crypto.randomUUID(), type: 'url', value: EXAMPLE_IMAGE_URL },
    { id: crypto.randomUUID(), type: 'url', value: EXAMPLE_PDF_URL },
  ])

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

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
                <label className={labelCls}>
                  HTML
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
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
                <label className={labelCls}>Filename</label>
                <input
                  type="text"
                  name="filename"
                  defaultValue={EXAMPLE_FILENAME}
                  placeholder="output.pdf"
                  className={inputCls}
                />
              </div>
            )}

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
