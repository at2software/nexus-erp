export const getYearProgress = (): number => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1); // Jan 1
    const end = new Date(now.getFullYear() + 1, 0, 1); // Jan 1 next year
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    return +(elapsedMs / totalMs)
}
export const getMonthsIntoYear = (): number => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1st
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1); // Jan 1st next year

  const totalMsInYear = endOfYear.getTime() - startOfYear.getTime();
  const elapsedMs = now.getTime() - startOfYear.getTime();

  const monthsElapsed = (elapsedMs / totalMsInYear) * 12;

  return +monthsElapsed.toFixed(4); // 4 digits precision
}