export const short = (n:number):string => {
    if (n == 0) return "" + n
    const negative = n < 0
    if (negative) {
        n = -n
    }
	const p = Math.floor(Math.log10(n))
	const rounded = Math.round(n / Math.pow(10, p - 2))
	let e = rounded * Math.pow(10, p % 3)
	e = parseFloat((e * 0.01).toFixed(2))
    const ret = (suffix:string = '') => (negative ? '-' : '') + e.toString() + suffix
	if (p < 3) return ret()	
    if (p < 6) return ret('K')
	if (p < 9) return ret('M')
	if (p < 12) return ret('B')
	return ret('N/A')
}