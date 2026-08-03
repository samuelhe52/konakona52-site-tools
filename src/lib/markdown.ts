const FENCED_CODE_BLOCK = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g
const BRACKETED_DISPLAY_MATH = /\\\[\s*([\s\S]*?)\s*\\\]/g
const PARENTHESIZED_INLINE_MATH = /\\\(\s*([\s\S]*?)\s*\\\)/g

/**
 * `remark-math` supports dollar-delimited math. Normalize the common TeX
 * shorthands so all supported delimiters render consistently. Fenced code is
 * left untouched so documentation examples remain literal.
 */
export function normalizeMathDelimiters(source: string) {
  return source
    .split(FENCED_CODE_BLOCK)
    .map((segment) => {
      if (segment.startsWith('```') || segment.startsWith('~~~')) return segment

      return segment
        .replace(
          BRACKETED_DISPLAY_MATH,
          (_match, expression: string) => `\n$$\n${expression.trim()}\n$$\n`,
        )
        .replace(
          PARENTHESIZED_INLINE_MATH,
          (_match, expression: string) => `$${expression.trim()}$`,
        )
    })
    .join('')
}
