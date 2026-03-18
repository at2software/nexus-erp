import { Observable } from 'rxjs';

export { } // this will make it module

declare global { // this is important to access it as global type String
	interface Array<T> {
		first():T|undefined
		last():T|undefined
		remove(_:T):T
		flattened():T
		sum():number
		groupBy(cmp:((object:any)=>string|number)):T[][]
        unique():T[]
        contains(_:T):boolean
	}
	interface String {
		capitalize():string
        escape():string
        formatPlaceholders():string
	}
    interface Promise<T> {
        confirmed<TResult1 = T, TResult2 = never>(onfulfilled: ((value: NonNullable<T>) => TResult1)): Promise<void | TResult1 | TResult2>
    }
    interface ActivatedRouteSnapshot {
        toPath():string
    }
}

declare module 'rxjs' {
  interface Observable<T> {
    subscribeTo<U>(target: U, key: keyof U, callback?: (value: T) => void): void
    subscribeAndMerge(target: { mergeArrayInto(key: string, items: any[]): void }, key: string, callback?: (value: T) => void): void
  }
}

Array.prototype.last = function() { return this.length ? this[this.length - 1] : undefined }
Array.prototype.first = function() { return this.length ? this[0] : undefined }
Array.prototype.remove = function<T>(_:T) { this.splice(this.indexOf(_), 1); return this; }
Array.prototype.sum = function() { let i = 0; this.forEach(_ => i += _); return i; }
Array.prototype.contains = function<T>(_:T) { return this.findIndex(x => x === _) !== -1 }
Array.prototype.flattened = function() { 
    const ret:any[] = []
    for (const _ of this) {
        ret.push(..._)
    }
    return ret
}
Array.prototype.unique = function() { return this.filter((value:any, index:number, array:any[]) => array.indexOf(value) === index); }
/**
 * Sorts an array of objects into a two-dimensional array, where the first level is divided by the cmp return
 * Input: array = [{foo: 1}, {foo: 1}, {foo: 1}, {foo: 1}, {foo: 2}, {foo: 2}]
 * array2 = array.pivotSort(_ => _.foo)
 * Returns: [[{foo: 1}, {foo: 1}, {foo: 1}, {foo: 1}], [{foo: 2}, {foo: 2}]]
 */
Array.prototype.groupBy = function (cmp:((object:any)=>string|number)) { 	
	const m:any = {}
	for (const o of this) {
		const key = cmp(o)
		if (!(key in m)) m[key] = []
		m[key].push(o)
	}
	return Object.values(m)
};
export const toKeyValue = (_:object) => Object.keys(_).map(k => ({ key: k, value: (_ as any)[k]})).filter(x => !Array.isArray(x.value))
export const toXY = (_:object) => Object.keys(_).map(k => ({ x: k, y: (_ as any)[k]})).filter(x => !Array.isArray(x.y))

Promise.prototype.confirmed = function (onfulfilled: ((value: NonNullable<any>) => any)) {
    return this.then((result) => {
        if (result) {
            onfulfilled(result!)
        }
    }).catch()
}
String.prototype.capitalize = function () { return this.charAt(0).toUpperCase() + this.slice(1) }
String.prototype.escape = function () { return this.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
String.prototype.formatPlaceholders = function() { return this.replace(/(\[.*?\])/g, "<code>$1</code>") }


Observable.prototype.subscribeTo = function <T>(target: any, key: string | number | symbol, callback?: (value: T) => void): void {
    this.subscribe((response: T) => {
        target[key] = response
        callback?.(response)
    })
};
Observable.prototype.subscribeAndMerge = function <T>(target: any, key: string, callback?: (value: T) => void): void {
    this.subscribe((response: T) => {
        target.mergeArrayInto(key, response)
        callback?.(response)
    })
};