import { Subject } from 'rxjs';
import type { Serializable } from './serializable';

/**
 * Tracks every live (on-screen) Serializable instance by `class:id`, so LiveSyncService
 * can apply one refetched payload to every instance representing the same backend row.
 * WeakRef + FinalizationRegistry keep this from pinning instances in memory once a
 * component throws them away - lists here run into the hundreds.
 */
export class LiveModelRegistry {
    static #instances = new Map<string, WeakRef<Serializable>[]>();
    static #finalizer = new FinalizationRegistry<string>((key) => LiveModelRegistry.#prune(key));

    static #updated = new Subject<Serializable>();
    static readonly updated$ = LiveModelRegistry.#updated.asObservable();

    static keyFor(className: string, id: string | number): string {
        return `${className}:${id}`;
    }

    static register(instance: Serializable): void {
        if (!instance.class || !instance.id) return;
        const key = LiveModelRegistry.keyFor(instance.class, instance.id);
        const refs = LiveModelRegistry.#instances.get(key) ?? [];
        if (refs.some((ref) => ref.deref() === instance)) return;
        refs.push(new WeakRef(instance));
        LiveModelRegistry.#instances.set(key, refs);
        LiveModelRegistry.#finalizer.register(instance, key);
    }

    static lookup(className: string, id: string | number): Serializable[] {
        const key = LiveModelRegistry.keyFor(className, id);
        const refs = LiveModelRegistry.#instances.get(key);
        if (!refs) return [];

        const alive: Serializable[] = [];
        const survivors: WeakRef<Serializable>[] = [];
        for (const ref of refs) {
            const instance = ref.deref();
            if (instance) {
                alive.push(instance);
                survivors.push(ref);
            }
        }
        LiveModelRegistry.#store(key, survivors);
        return alive;
    }

    /** Emits an instance after its attributes were refreshed in place - subscribe to react (e.g. re-signal a guard's held object). */
    static notifyUpdated(instance: Serializable): void {
        LiveModelRegistry.#updated.next(instance);
    }

    static #prune(key: string): void {
        const refs = LiveModelRegistry.#instances.get(key);
        if (!refs) return;
        LiveModelRegistry.#store(key, refs.filter((ref) => ref.deref() !== undefined));
    }

    static #store(key: string, refs: WeakRef<Serializable>[]): void {
        if (refs.length) LiveModelRegistry.#instances.set(key, refs);
        else LiveModelRegistry.#instances.delete(key);
    }
}
