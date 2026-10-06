import type { CopySet } from './strings'

export type ToolEntry = {
  path: string
  index: string
  title: (copy: CopySet) => string
  description: (copy: CopySet) => string
}

export const TOOLS: readonly ToolEntry[] = [
  {
    path: '/chatgpt-share',
    index: '01',
    title: copy => copy.home.chatgptShareTitle,
    description: copy => copy.home.chatgptShareDescription,
  },
  {
    path: '/markdown-viewer',
    index: '02',
    title: copy => copy.home.markdownTitle,
    description: copy => copy.home.markdownDescription,
  },
  {
    path: '/uestc',
    index: '03',
    title: copy => copy.home.toolTitle,
    description: copy => copy.home.toolDescription,
  },
]

export function toolForPath(pathname: string): ToolEntry | undefined {
  const normalized = pathname.replace(/\/+$/, '')
  return TOOLS.find(tool => tool.path === normalized)
}
