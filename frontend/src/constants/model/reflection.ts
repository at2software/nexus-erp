import { NxStatic } from '@app/nx/nx.static';
import { Serializable } from '@models/_core/serializable';
import { Dictionary } from '../constants';

export const REFLECTION = <T = unknown>(json: unknown, name?: string): T => {
    if (json instanceof Serializable) return json as T;

    if (!name && json && typeof json === 'object' && 'class' in json) {
        name = String(json.class);
    }
    if (!name) return json as T;
    const ctor = NxStatic.MODEL_REGISTRY_TOKEN[name] as unknown as ({ fromJson?: (data: Dictionary) => T } & (new (data?: unknown) => T)) | undefined;
    if (!ctor) return json as T;
    return typeof ctor.fromJson === 'function' ? ctor.fromJson(json as Dictionary) : new ctor(json);
};
