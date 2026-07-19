import type { Locale } from './locale'

export type CopySet = {
  siteTitle: string
  home: {
    toolTitle: string
    toolDescription: string
    chatgptShareTitle: string
    chatgptShareDescription: string
    markdownTitle: string
    markdownDescription: string
    moreComing: string
  }
  tool: {
    title: string
    description: string
    notice: string
    backToHome: string
    swapAriaLabel: string
    inputLabelEncrypt: string
    inputLabelDecrypt: string
    outputLabelEncrypt: string
    outputLabelDecrypt: string
    encryptPlaceholder: string
    decryptPlaceholder: string
    outputPlaceholder: string
    convertFailed: string
    copy: string
    copied: string
    copyFailed: string
    jumpTo: string
    jumpUnavailable: string
  }
  share: {
    title: string
    description: string
    backToHome: string
    privacy: string
    urlLabel: string
    fetch: string
    fetching: string
    fetchFailed: string
    or: string
    importHtml: string
    importSource: string
    importFailed: string
    summary: string
    downloadMarkdown: string
    downloadBundle: string
    bundling: string
    bundleReady: string
    bundlePartial: string
    bundleFailed: string
    fileStatus: string
    filesLabel: string
    unavailableUploadsShort: string
    sessionArtifactsShort: string
    previewTitle: string
    notice: string
  }
}

const COPY: Record<Locale, CopySet> = {
  'zh-CN': {
    siteTitle: "Kona's Toolbox",
    home: {
      toolTitle: 'UESTC WebVPN 转换',
      toolDescription: '普通 UESTC 链接与 WebVPN 代理链接互转。',
      chatgptShareTitle: 'ChatGPT 分享导出',
      chatgptShareDescription: '将公开分享对话导出为 Markdown。',
      markdownTitle: 'Markdown 在线预览',
      markdownDescription: '粘贴或导入 Markdown 文件并预览。',
      moreComing: '更多工具开发中。',
    },
    tool: {
      title: 'UESTC WebVPN 转换',
      description: '普通 UESTC 链接与 WebVPN 代理链接互转。',
      notice: '本工具仅供电子科技大学在校师生使用，WebVPN 认证须由用户自行完成。',
      backToHome: '工具箱',
      swapAriaLabel: '切换方向',
      inputLabelEncrypt: '原始链接',
      inputLabelDecrypt: 'WebVPN 链接',
      outputLabelEncrypt: 'WebVPN 链接',
      outputLabelDecrypt: '原始链接',
      encryptPlaceholder: 'https://news.uestc.edu.cn/...',
      decryptPlaceholder: 'https://webvpn.uestc.edu.cn/...',
      outputPlaceholder: '转换结果',
      convertFailed: '无法转换此链接。',
      copy: '复制',
      copied: '已复制',
      copyFailed: '重试',
      jumpTo: '前往',
      jumpUnavailable: '当前结果不可直接打开。',
    },
    share: {
      title: 'ChatGPT 分享导出',
      description: '将公开 ChatGPT 分享链接导出为 Markdown 或 ZIP。',
      backToHome: '工具箱',
      privacy: '为绕过浏览器的跨域限制，分享链接会被发送到本站代理以获取 HTML。代理不存储、记录或保留链接和对话内容；解析与文件导出始终在你的浏览器中完成。你也可以直接上传已保存的 HTML，避免将对话发送到代理。',
      urlLabel: 'ChatGPT 分享链接',
      fetch: '获取并解析',
      fetching: '获取中…',
      fetchFailed: '无法获取此分享链接。',
      or: '或',
      importHtml: '导入已保存的 HTML',
      importSource: '已导入的 ChatGPT 分享页面',
      importFailed: '无法读取此 HTML 文件。',
      summary: '{messages} 条消息 · {attachments} 个文件引用',
      downloadMarkdown: '下载 Markdown',
      downloadBundle: '下载 ZIP',
      bundling: '正在打包…',
      bundleReady: 'ZIP 已准备好。',
      bundlePartial: '{count} 个附件未包含，详见 ZIP 内清单。',
      bundleFailed: '无法创建 ZIP。',
      fileStatus: '文件限制',
      filesLabel: '文件',
      unavailableUploadsShort: '{count} 个原始上传文件不可用',
      sessionArtifactsShort: '{count} 个生成文件仅能在 ChatGPT 下载',
      previewTitle: '预览',
      notice: '仅处理公开的 chatgpt.com/share 链接。',
    },
  },
  en: {
    siteTitle: "Kona's Toolbox",
    home: {
      toolTitle: 'UESTC WebVPN Redirect',
      toolDescription: 'Convert between plain UESTC URLs and WebVPN-proxied URLs.',
      chatgptShareTitle: 'ChatGPT Share Export',
      chatgptShareDescription: 'Export a public shared chat to Markdown.',
      markdownTitle: 'Markdown Viewer',
      markdownDescription: 'Paste or import a Markdown file and preview it.',
      moreComing: 'More tools coming.',
    },
    tool: {
      title: 'UESTC WebVPN Redirect',
      description: 'Convert between plain UESTC URLs and WebVPN-proxied URLs.',
      notice:
        'This tool is intended for UESTC students and staff only. WebVPN authentication is your own responsibility.',
      backToHome: 'Toolbox',
      swapAriaLabel: 'Switch direction',
      inputLabelEncrypt: 'Plain URL',
      inputLabelDecrypt: 'WebVPN URL',
      outputLabelEncrypt: 'WebVPN URL',
      outputLabelDecrypt: 'Plain URL',
      encryptPlaceholder: 'https://news.uestc.edu.cn/...',
      decryptPlaceholder: 'https://webvpn.uestc.edu.cn/...',
      outputPlaceholder: 'Converted output',
      convertFailed: 'Could not convert this URL.',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Retry',
      jumpTo: 'Open',
      jumpUnavailable: 'This output cannot be opened directly.',
    },
    share: {
      title: 'ChatGPT Share Export',
      description: 'Export a public ChatGPT shared conversation as Markdown or a ZIP.',
      backToHome: 'Toolbox',
      privacy: 'To work around browser cross-origin restrictions, your share link is sent to our proxy to retrieve its HTML. The proxy does not store, log, or retain the link or conversation content; parsing and file export remain in your browser. You can also upload saved HTML directly to avoid sending chats to our proxy.',
      urlLabel: 'ChatGPT shared link',
      fetch: 'Fetch and export',
      fetching: 'Fetching…',
      fetchFailed: 'Could not fetch this shared conversation.',
      or: 'or',
      importHtml: 'Import saved HTML',
      importSource: 'Imported ChatGPT share page',
      importFailed: 'Could not read this HTML file.',
      summary: '{messages} messages · {attachments} file reference(s)',
      downloadMarkdown: 'Download Markdown',
      downloadBundle: 'Download ZIP',
      bundling: 'Building ZIP…',
      bundleReady: 'ZIP is ready.',
      bundlePartial: '{count} attachment(s) were not included; see the ZIP manifest.',
      bundleFailed: 'Could not create the ZIP.',
      fileStatus: 'File limitations',
      filesLabel: 'Files',
      unavailableUploadsShort: '{count} original upload(s) unavailable',
      sessionArtifactsShort: '{count} generated file(s) download only on ChatGPT',
      previewTitle: 'Preview',
      notice: 'Only public chatgpt.com/share links are accepted.',
    },
  },
}

export function getCopy(locale: Locale): CopySet {
  return COPY[locale]
}
