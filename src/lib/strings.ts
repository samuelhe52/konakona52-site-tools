import type { Locale } from './locale'

export type CopySet = {
  siteTitle: string
  home: {
    heroTitle: string
    heroSubtitle: string
    toolTitle: string
    toolDescription: string
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
}

const COPY: Record<Locale, CopySet> = {
  'zh-CN': {
    siteTitle: "Kona's Toolbox",
    home: {
      heroTitle: '工具箱',
      heroSubtitle: '浏览器端运行的实用工具。数据不离开你的设备。',
      toolTitle: 'UESTC WebVPN 转换',
      toolDescription: '普通 UESTC 链接与 WebVPN 代理链接互转。',
      markdownTitle: 'Markdown 在线预览',
      markdownDescription: '粘贴或导入 Markdown 文件，即刻预览。',
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
  },
  en: {
    siteTitle: "Kona's Toolbox",
    home: {
      heroTitle: 'Toolbox',
      heroSubtitle: 'Small browser-side utilities. Your data never leaves the device.',
      toolTitle: 'UESTC WebVPN Redirect',
      toolDescription: 'Convert between plain UESTC URLs and WebVPN-proxied URLs.',
      markdownTitle: 'Markdown Viewer',
      markdownDescription: 'Paste or import a Markdown file and preview it instantly.',
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
  },
}

export function getCopy(locale: Locale): CopySet {
  return COPY[locale]
}
