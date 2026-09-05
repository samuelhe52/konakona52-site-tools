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
  uestc: {
    title: string
    description: string
    vpnTitle: string
    vpnDescription: string
    pdfTitle: string
    pdfDescription: string
    pdfSteps: readonly [string, string]
    calendarTitle: string
    calendarDescription: string
    calendarSteps: readonly [string, string, string]
    calendarStartDateLabel: string
    calendarStartDateHint: string
    calendarStartDateInvalid: string
    consoleStep: string
    consoleInstructions: readonly [string, string]
    copyScript: string
    copyingScript: string
    scriptCopied: string
    scriptCopyFailed: string
    viewScript: string
    calendarAttribution: string
    forkRepository: string
    sourceRepository: string
    licenseTerms: string
    privacy: string
  }
  tool: {
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
      toolTitle: 'UESTC 工具',
      toolDescription: '让你的成电生活轻松一点。',
      chatgptShareTitle: 'ChatGPT 分享导出',
      chatgptShareDescription: '将公开分享对话导出为 Markdown。',
      markdownTitle: 'Markdown 在线预览',
      markdownDescription: '粘贴或导入 Markdown 文件并预览。',
      moreComing: '更多工具开发中。',
    },
    uestc: {
      title: 'UESTC 工具',
      description: '几个顺手的浏览器小工具，让你的成电生活轻松一点。',
      vpnTitle: 'WebVPN 链接转换',
      vpnDescription: '普通 UESTC 链接与 WebVPN 代理链接互转。',
      pdfTitle: '下载公告内嵌的 PDF',
      pdfDescription: '在已能访问的校内公告页面中运行脚本，查找并下载其中嵌入的 PDF 文件。',
      pdfSteps: [
        '通过校园网或 WebVPN 打开包含内嵌 PDF 的公告。',
        '粘贴脚本并回车；PDF 将自动下载。',
      ],
      calendarTitle: '导出课表日历',
      calendarDescription: '在教务系统“我的课表”页面运行脚本，生成可导入日历应用的 ICS 文件。',
      calendarSteps: [
        '打开教务系统的“我的课表”。',
        '粘贴脚本并回车；课表 ICS 将自动下载。',
        'iOS：将下载的 ICS 文件保存到“文件”App，然后将它拖入“日历”App 并松开。',
      ],
      calendarStartDateLabel: '第一周周一日期（可选）',
      calendarStartDateHint: '留空则自动推断。如果控制台提示“开始日期不合法”，请选择第一周的周一，再次复制脚本。',
      calendarStartDateInvalid: '请选择第一周的周一。',
      consoleStep: '打开浏览器控制台：',
      consoleInstructions: [
        'Safari：选择“开发”→“显示 JavaScript 控制台”，或按 ⌘⌥C。',
        'Chrome/Edge：Mac 按 ⌘⌥J；Windows/Linux 按 F12 后选择 Console。',
      ],
      copyScript: '复制脚本',
      copyingScript: '正在读取…',
      scriptCopied: '脚本已复制',
      scriptCopyFailed: '无法复制，请打开脚本源码手动复制。',
      viewScript: '查看脚本源码',
      calendarAttribution: '课表脚本基于 Saafo/uestc-coursetable-parser，并按 GPL-3.0 提供。',
      forkRepository: '维护分支',
      sourceRepository: '上游仓库',
      licenseTerms: 'GPL-3.0 许可',
      privacy: '两个脚本都只在你打开的大学页面中运行；Kona’s Toolbox 不会收到你的登录信息、Cookie、PDF、课表或导出文件。运行前请检查脚本源码。',
    },
    tool: {
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
      toolTitle: 'UESTC Tools',
      toolDescription: 'Make your life at UESTC a little easier.',
      chatgptShareTitle: 'ChatGPT Share Export',
      chatgptShareDescription: 'Export a public shared chat to Markdown.',
      markdownTitle: 'Markdown Viewer',
      markdownDescription: 'Paste or import a Markdown file and preview it.',
      moreComing: 'More tools coming.',
    },
    uestc: {
      title: 'UESTC Tools',
      description: 'Handy browser tools to make your life at UESTC a little easier.',
      vpnTitle: 'WebVPN URL converter',
      vpnDescription: 'Convert between plain UESTC URLs and WebVPN-proxied URLs.',
      pdfTitle: 'Download an embedded PDF from an announcement',
      pdfDescription: 'Run a script on an accessible university announcement page to locate and download its embedded PDF.',
      pdfSteps: [
        'Open an announcement containing an embedded PDF through the campus network or WebVPN.',
        'Paste the script and press Enter; the PDF downloads automatically.',
      ],
      calendarTitle: 'Export your course calendar',
      calendarDescription: 'Run a script on “My Timetable” in the course system to create an ICS file for your calendar app.',
      calendarSteps: [
        'Open “My Timetable” in the course system.',
        'Paste the script and press Enter; the timetable ICS downloads automatically.',
        'iOS: save the downloaded ICS file to the Files app, then drag it into the Calendar app and release.',
      ],
      calendarStartDateLabel: 'First Monday of week 1 (optional)',
      calendarStartDateHint: 'Leave blank for automatic detection. If the console reports an invalid start date, choose the Monday that starts week 1 and copy the script again.',
      calendarStartDateInvalid: 'Choose the Monday that starts week 1.',
      consoleStep: 'Open the browser console:',
      consoleInstructions: [
        'Safari: choose Develop → Show JavaScript Console, or press ⌘⌥C.',
        'Chrome/Edge: press ⌘⌥J on Mac; on Windows or Linux, press F12 and select Console.',
      ],
      copyScript: 'Copy script',
      copyingScript: 'Loading…',
      scriptCopied: 'Script copied',
      scriptCopyFailed: 'Could not copy it. Open the script source and copy it manually.',
      viewScript: 'View script source',
      calendarAttribution: 'The calendar script is derived from Saafo/uestc-coursetable-parser and provided under GPL-3.0.',
      forkRepository: 'Maintained fork',
      sourceRepository: 'Upstream repository',
      licenseTerms: 'GPL-3.0 license',
      privacy: 'Both scripts run only inside the university page you opened. Kona’s Toolbox never receives your login, cookies, PDF, timetable, or exported files. Review the source before running it.',
    },
    tool: {
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
