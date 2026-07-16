import { NxGlobal } from '@app/nx/nx.global';
import { Serializable } from '@models/serializable';
import { Dictionary } from './constants';

export const REFLECTION = <T = unknown>(json: unknown, name?: string): T => {
    // If it's already a Serializable instance, return it as-is to avoid recursion
    if (json instanceof Serializable) return json as T;

    if (!name && json && typeof json === 'object' && 'class' in json) {
        name = String(json.class);
    }
    if (!name) return json as T;
    // Dynamic reflection boundary: a registry entry (an abstract `typeof Serializable`) is, at runtime,
    // a concrete model class producing the caller's `T` — routed through `unknown` to assert that.
    const ctor = NxGlobal.MODEL_REGISTRY_TOKEN[name] as unknown as ({ fromJson?: (data: Dictionary) => T } & (new (data?: unknown) => T)) | undefined;
    if (!ctor) return json as T;
    return typeof ctor.fromJson === 'function' ? ctor.fromJson(json as Dictionary) : new ctor(json);
};
