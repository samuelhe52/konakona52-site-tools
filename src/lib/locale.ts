export type Locale = 'zh-CN' | 'en'

export function detectLocale(languages: readonly string[]): Locale {
  return languages.some((language) => language.toLowerCase().startsWith('zh'))
    ? 'zh-CN'
    : 'en'
}

export function parseLocaleOverride(value: string | null | undefined): Locale | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.toLowerCase()
  if (normalized.startsWith('zh')) {
    return 'zh-CN'
  }

  if (normalized.startsWith('en')) {
    return 'en'
  }

  return undefined
}
