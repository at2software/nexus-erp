import { NxGlobal } from '@app/nx/nx.global';
import { Serializable } from '@models/serializable';

export const REFLECTION = <T = any>(json: any, name?: string): T => {
    // If it's already a Serializable instance, return it as-is to avoid recursion
    if (json instanceof Serializable) return json as T;
    
    if (!name && json && typeof json === 'object' && 'class' in json) {
        name = json.class;
    }
    if (!name) return json;
    const ctor = NxGlobal.MODEL_REGISTRY_TOKEN[name];
    if (!ctor) return json;
    return typeof ctor.fromJson === 'function' ? ctor.fromJson(json) : new ctor(json);
}