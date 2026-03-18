import { VcardAddress } from "./VcardAddress"
import { VcardRow } from "./VcardRow"

export class Vcard {

    rows: VcardRow[]
    get name(): string { return this.#trackFN !== -1 ? this.rows[this.#trackFN].vals[0] : '' }
    get url(): string|undefined { return this.#trackURL !== -1 ? this.rows[this.#trackURL].vals[0] : undefined }
    get org(): string|undefined { return this.#trackORG !== -1 ? this.rows[this.#trackORG].vals[0] : undefined }
    title: string = ''

    #trackFN: number = -1
    #trackORG: number = -1
    #trackURL: number = -1

    constructor(vcard: string) {
        const a: VcardRow[] = []
        vcard.split('\n').map((x: any) => {
            const v = VcardRow.fromString(x)
            if (v) {
                if (v.key == 'FN') this.#trackFN = a.length
                if (v.key == 'ORG') this.#trackORG = a.length
                if (v.key == 'URL') this.#trackURL = a.length
                a.push(v)
                if (v.key == 'TITLE') this.title = v.vals.join('')
            }
        })
        this.rows = a
    }
    getAddress = (): VcardAddress[] => this.rows.filter(x => x.key.toUpperCase() == 'ADR').map(x => new VcardAddress(x.vals))
    get = (key: string, mods: string | undefined = undefined): VcardRow[] => this.rows.filter(x => {
        if (x.key != key) return false
        if (mods !== undefined) {
            for (const mod of x.mods) {
                if (mods.match(mod)) return true
                return false
            }
        }
        return true
    })
    first = (key: string, mods: string | undefined = undefined): VcardRow | undefined => {
        const _ = this.get(key, mods)
        return _.length > 0 ? _[0] : undefined
    }

    toString = (): string => this.rows.map(_ => _.toString()).join("\n")

}