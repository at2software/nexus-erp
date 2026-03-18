import { registerAutoWrapKey } from './autowrap';

export function Accessor<T>(transform?: (val: any) => T, onSet?: (this: any, val: any) => void) {
    return (target: any, propertyKey: string) => {
        const privateKey = `_${propertyKey}`;
        registerAutoWrapKey(target, function(this: any) {
            Object.defineProperty(this, propertyKey, {
                get: () => this[privateKey],
                set(val: any) {
                    this[privateKey] = transform?.(val) ?? val
                    onSet?.call(this, val)
                },
                enumerable: true,
                configurable: true
            });
        });
    };
}

export function AccessorArray<T>(transform?: (val: any) => T) {
    return (target: any, propertyKey: string) => {
        const privateKey = `_${propertyKey}`;
        registerAutoWrapKey(target, function(this: any) {
            Object.defineProperty(this, propertyKey, {
                get: () => this[privateKey] ?? [],
                set: (val: any[]) => this[privateKey] = val?.map((_: any) => transform?.(_) ?? _),
                enumerable: true,
                configurable: true
            });
        });
    };
}
