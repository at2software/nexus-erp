import { REFLECTION } from "./reflection"

export function AutoWrap(ctorName: string) {
    return (target: any, key: string) => {
        const privateKey = `__${key}`;
        registerAutoWrapKey(target, function(this: any) {
            Object.defineProperty(this, key, {
                get: () => this[privateKey],
                set: (value: any) => value && (this[privateKey] = REFLECTION(value, ctorName)),
                enumerable: true,
                configurable: true
            });
        });
    };
}

export function AutoWrapArray(ctorName: string) {
    return (target: any, key: string) => {
        const privateKey = `__${key}`;
        registerAutoWrapKey(target, function(this: any) {
            Object.defineProperty(this, key, {
                get: () => this[privateKey] ?? [],
                set: (values: any[]) => Array.isArray(values) && (this[privateKey] = values.map(v => REFLECTION(v, ctorName))),
                enumerable: true,
                configurable: true
            });
        });
    };
}

export function registerAutoWrapKey(target: any, initFn: (this: any) => void) {
    const ctor = target.constructor;
    ctor.__autoWrapKeys ??= [];
    ctor.__autoWrapKeys.push(initFn);

    if (!ctor.prototype.__autoWrapInit) {
        ctor.prototype.__autoWrapInit = function() {
            let proto = this.constructor;
            const allKeys: ((this: any) => void)[] = [];
            while (proto?.__autoWrapKeys) {
                allKeys.unshift(...proto.__autoWrapKeys);
                proto = Object.getPrototypeOf(proto);
            }
            allKeys.forEach(fn => fn.call(this));
        };
    }
}