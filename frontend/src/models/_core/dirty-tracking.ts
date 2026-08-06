import type { Dictionary } from '@constants/constants';
import { deepEqual } from '@constants/object/deepEqual';
import { nx } from '@models/_core/nx-bridge';
import type { Serializable } from '@models/_core/serializable';

export const baselineFor = (self: Serializable): string | undefined => {
    const bridge = nx();
    return bridge ? JSON.stringify(bridge.payloadFor(self, self.constructor as typeof Serializable)) : undefined;
};

export const changedFields = (current: Dictionary, baseline: string | undefined): Dictionary => {
    const base = JSON.parse(baseline ?? '{}') as Dictionary;
    const diff: Dictionary = {};
    for (const key of Object.keys(current)) {
        if (!deepEqual(base[key], current[key])) diff[key] = current[key];
    }
    return diff;
};
