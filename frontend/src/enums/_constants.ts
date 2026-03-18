export const enumKeys = (a:any):string[] => Object.keys(a).filter(key => !isNaN(Number(a[key])))
export const enumValuesFor = <T>(key:string, E:any):T => (E as any)[key] as T