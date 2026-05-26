export type Locale = 'zh-CN' | 'en'

export function detectLocale(languages: readonly string[]): Locale {
  return languages.some((language) => language.toLowerCase().startsWith('zh'))
    ? 'zh-CN'
    : 'en'
}
