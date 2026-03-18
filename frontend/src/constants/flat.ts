export const flat = <T>(arr:T[][]):T[] => {
    const r:T[] = []
    for (const _ of arr) r.push(..._)
    return r
}