'use client'
import { useState } from 'react'
import { Link } from '@/components/common'

export const CurlCode = () => {
  const [copied, setCopied] = useState(false)

  const codeString = `curl -X POST '${window?.location}api/gen' \\
  --header 'Content-Type: application/json' \\
  --output 'foo.pdf' \\
  --data-raw '{
    "filename": "foo.pdf",
    "html": "<html><head><script src=\\"https:\\/\\/cdn.tailwindcss.com\\"><\\/script><\\/head><body class=\\"h-screen grid place-items-center\\"><span class=\\"print:hidden\\">IT SHOULD NO BE PRINTED<\\/span><div class=\\"bg-pink-300 text-pink-800 p-8 h-[100px] grid place-items-center font-medium font-mono\\">@mathieutu<\\/div><\\/body><\\/html>"
  }'`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden bg-gray-900 shadow-md relative">
      <button
        onClick={copyToClipboard}
        className="print:hidden absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-gray-500"
        aria-label="Copy code to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="px-6 py-6 sm:px-8 overflow-x-auto text-sm text-white">
        <code>{codeString}</code>
      </pre>

    </div>
  )
}

export const UrlGet = () => (
  <Link
    href={`${window?.location}api/gen?url=${window?.location}`}
  >
    {`${window?.location}api/gen?url=${window?.location}`}
  </Link>
)
