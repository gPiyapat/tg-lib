export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randToken(prefix?: string): string {
  const token = Math.random().toString(36).substr(2)
  if (prefix) {
    return `${prefix}-${token}`
  } else {
    return token
  }
}
