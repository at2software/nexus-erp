import type { Dictionary } from '@constants/constants';
import { deepCopy } from '@constants/object/deepClone';
import type { Serializable } from '@models/_core/serializable';

export const cloneOf = <T extends Serializable>(self: Serializable): T => {
    const clone = new (self.constructor as new () => T)();
    const source = self as unknown as Dictionary<unknown>;
    for (const key of Object.keys(self)) {
        const value = source[key];
        if (typeof value === 'function') continue;
        (clone as Dictionary<unknown>)[key] = key === 'httpService' ? value : deepCopy(value);
    }
    return clone;
};
