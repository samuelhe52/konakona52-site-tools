const FENCED_CODE_BLOCK = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g
const BRACKETED_DISPLAY_MATH = /\\\[\s*([\s\S]*?)\s*\\\]/g

/**
 * `remark-math` supports dollar-delimited math. Normalize the common TeX
 * display shorthand so both `\[ ... \]` and `$$ ... $$` render consistently.
 * Fenced code is left untouched so documentation examples remain literal.
 */
export function normalizeDisplayMath(source: string) {
  return source
    .split(FENCED_CODE_BLOCK)
    .map((segment) => {
      if (segment.startsWith('```') || segment.startsWith('~~~')) return segment

      return segment.replace(
        BRACKETED_DISPLAY_MATH,
        (_match, expression: string) => `\n$$\n${expression.trim()}\n$$\n`,
      )
    })
    .join('')
}
