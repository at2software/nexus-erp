import type { Dictionary } from '@constants/constants';
import type { Serializable } from '@models/_core/serializable';

const isSerializable = (value: unknown): value is Serializable =>
    !!value && typeof value === 'object' && typeof (value as Partial<Serializable>).afterDeserialize === 'function';

/**
 * Recursively calls afterDeserialize on nested Serializable instances (children first).
 * `seen` guards against circular relations (e.g. product.invoice_items[].product_source === product)
 * which would otherwise recurse until the call stack overflows.
 */
export function initNestedSerializables(instance: Serializable, json: unknown, seen = new WeakSet<Serializable>()): void {
    if (seen.has(instance)) return;
    seen.add(instance);
    if (!json || typeof json !== 'object') return;
    const jsonRecord = json as Dictionary;
    const instanceRecord = instance as unknown as Dictionary;
    for (const key of Object.keys(instance)) {
        const val = instanceRecord[key];
        const rawVal = jsonRecord[key];
        if (isSerializable(val)) {
            if (seen.has(val)) continue;
            const nestedJson = rawVal && typeof rawVal === 'object' ? rawVal as Dictionary : {};
            initNestedSerializables(val, nestedJson, seen);
            val.afterDeserialize(nestedJson);
        } else if (Array.isArray(val)) {
            const rawArr = Array.isArray(rawVal) ? rawVal : [];
            for (let i = 0; i < val.length; i++) {
                if (isSerializable(val[i]) && !seen.has(val[i])) {
                    const itemJson = rawArr[i] && typeof rawArr[i] === 'object' ? rawArr[i] as Dictionary : {};
                    initNestedSerializables(val[i], itemJson, seen);
                    val[i].afterDeserialize(itemJson);
                }
            }
        }
    }
}
