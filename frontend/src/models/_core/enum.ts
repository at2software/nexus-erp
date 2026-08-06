export class Enum {
    constructor(_: Record<string, number>) {
        Object.assign(this, _);
    }
    toKeyValue(): KeyValue[] {
        return Object.keys(this).map((_) => ({ key: _, value: this[_] as number }));
    }
    [key: string]: number | ((...args: never[]) => unknown);
}
export class KeyValue {
    key: string = '';
    value: number = 0;
}
