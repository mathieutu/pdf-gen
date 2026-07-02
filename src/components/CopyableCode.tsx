'use client'

import { useState } from 'react'

export const CopyableCode = ({ html, code }: { html: string, code: string }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(setCopied, 2000, false)
  }

  return (
    <div className="relative overflow-hidden rounded-xl shadow-md">
      <button
        onClick={copyToClipboard}
        className="
          absolute top-2 right-2 rounded-sm bg-gray-700 px-2 py-1 text-xs
          text-white
          hover:bg-gray-600
          focus:ring-1 focus:ring-gray-500 focus:outline-none
          print:hidden
        "
        aria-label="Copy code to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div
        className="
          overflow-x-auto text-sm
          [&_pre]:p-6
          sm:[&_pre]:px-8
        "
        // eslint-disable-next-line react/dom-no-dangerously-set-innerhtml -- server-rendered syntax highlighting output, not user input
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
