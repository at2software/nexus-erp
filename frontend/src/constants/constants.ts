import moment, { Moment } from 'moment';

export enum RequestType { GET, POST, PUT, DELETE, OPTIONS }

export const firstOrDefault = (o:any[], predicate:(x:any)=>boolean, def:any):any => {
	const f = o.filter(predicate)
	return f.length ? f[0] : def
}
export const filtered = (o:Dictionary):Dictionary => {
    const n:Dictionary = {}
    for (const k in o) {
        if (o[k] !== undefined) n[k] = o[k]
    }
    return n
}
export const span = (o?:StartEnd):string|undefined => (o?.startDate?.format) ? o.startDate.format('DD.MM.YYYY') + ',' + o.endDate!.format('DD.MM.YYYY') : undefined

export type Dictionary = Record<string, any>;
export class StartEnd { 
    startDate: Moment|null
    endDate: Moment|null 
    toString = () => (this.startDate?.format && this.endDate?.format) ? { startDate:this.startDate, endDate:this.endDate } : undefined
    
    constructor(_:any|undefined = undefined) {
        if (_) {
            this.startDate = typeof _.startDate != 'string' ? _.startDate : moment(_.startDate)
            this.endDate = typeof _.endDate != 'string' ? _.endDate : moment(_.endDate)
        }
    }
    static forceObject = (_:any) => {
        if (_ instanceof StartEnd) {
            return _
        }
        if (_ && _.startDate && _.endDate) {
            return new StartEnd(_)
        }
        return undefined
    }
}

export const indexed = (a:any[], key:string):Dictionary => Object.assign({}, a.map((x:any) => ({[key]: x})))
/**
 * Converts an array of ISO objects to be used in typeahead param of <input-group> (unique keys only)
 * @param a The array to be converted
 * @param keyColumn name of the param to be used as key
 * @param nameColumn name of the param to be used as name
 * @returns 
 */
export const typeahead = (a:any[], keyColumn:string, nameColumn:string):{key:string, name:string}[] => a
    .map((x) => ({key:x[keyColumn] ?? '', name:x[nameColumn] ?? ''}))
    .filter((v:any, index, self) => index === self.findIndex((y:any) => y.key === v.key))

// Re-export REFLECTION for backward compatibility
export { REFLECTION } from './reflection';