import type { ComponentProps } from 'react'
import type { BundledLanguage } from 'shiki'
import { codeToHtml } from 'shiki'
import { CopyableCode } from '@/components/CopyableCode'

export const Link = (props: ComponentProps<'a'>) => (
  <a
    className="
      underline
      hover:text-blue-800
      dark:hover:text-blue-300
    "
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  />
)

export const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code
    className="
      rounded-sm bg-gray-100 px-1 py-0.5
      dark:bg-gray-800
    "
  >
    {children}
  </code>
)

export const CodeBlock = async ({ children, lang = 'text' }: { children: string, lang?: BundledLanguage | 'text' }) => {
  const html = await codeToHtml(children, { lang, theme: 'github-dark' })

  return <CopyableCode html={html} code={children} />
}
