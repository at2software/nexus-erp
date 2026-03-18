export class Enum {
	constructor(_:any) {
		Object.assign(this, _)
	}
	toKeyValue():KeyValue[] { return Object.keys(this).map(_ => ({ key: _, value: this[_] as number})) }
	[key: string]: number | ((...args: any[]) => any)
}
export class KeyValue { key: string; value: number}