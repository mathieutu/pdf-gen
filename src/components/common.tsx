import { ComponentProps } from 'react'

export const Link = (props: ComponentProps<'a'>) => <a
  className="underline hover:text-blue-800 dark:hover:text-blue-300"
  target="_blank" rel="noopener noreferrer"
  {...props}
/>
