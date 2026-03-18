import tinycolor from "tinycolor2";

export class Color extends tinycolor {

    static GoldenRatioHue:number = 60 * (1 + Math.sqrt(5))/2 //.5 * 222.4969097651422
    static ERROR_COLOR = '#990000'
    
    changeHsl = (changes:Partial<tinycolor.ColorFormats.HSLA>): Color => new Color(Object.assign(this.toHsl(), changes))

    /**
     * Returns the best contrasting text color (black or white) for this background color
     * Uses WCAG luminance calculation to determine optimal contrast
     * @returns Color object representing black (#000000) or white (#ffffff)
     */
    bestBW = (): Color => {
        // Get the luminance of the current color (0-1 scale)
        const luminance = this.getLuminance()
        
        // Use WCAG threshold: if luminance > 0.5, use black text, otherwise white text
        // This provides good contrast for most colors
        return luminance > 0.5 ? new Color('#000000') : new Color('#ffffff')
    }

    static get = (_: tinycolor.ColorInput): Color => new Color(_)
    static fromVar = (_: string, prefix:string = '--bs-'): Color => new Color(window.getComputedStyle(document.body).getPropertyValue(prefix + _) ?? Color.ERROR_COLOR)
    static fromHsl = (h:number, s:number, l:number) => new Color({h:h, s:s, l:l} as tinycolor.ColorFormats.HSL)
    static uniqueColorFromString = (_:string) => Color.posToHex(_.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360)
    static posToHex = (pos: number): string => Color.fromHsl(((pos * Color.GoldenRatioHue) % 360), 90, 45).toHexString()
    
}