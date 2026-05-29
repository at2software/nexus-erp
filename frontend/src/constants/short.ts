const c = (v: number): string => {
    const r = Math.round(v * 10) / 10
    return r < 10 ? r.toFixed(1) : String(Math.round(r))
}

export const short = (n: number): string => {
    const [s, a] = [n < 0 ? '-' : '', Math.abs(n)]
    if (a >= 1e12) return s + c(a / 1e12) + 'T'
    if (a >= 1e9)  return s + c(a / 1e9)  + 'B'
    if (a >= 1e6)  return s + c(a / 1e6)  + 'M'
    if (a >= 1e3)  return s + c(a / 1e3)  + 'K'
    return s + c(a)
}
