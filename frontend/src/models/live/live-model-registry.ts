import { Subject } from 'rxjs';
import type { Serializable } from '@models/_core/serializable';

export class LiveModelRegistry {
    static #instances = new Map<string, WeakRef<Serializable>[]>();
    static #registeredUnder = new WeakMap<Serializable, string>();
    static #nested = new WeakSet<Serializable>();
    static #finalizer = new FinalizationRegistry<string>((key) => LiveModelRegistry.#prune(key));

    static #updated = new Subject<Serializable>();
    static readonly updated$ = LiveModelRegistry.#updated.asObservable();

    static keyFor(className: string, id: string | number): string {
        return `${className}:${id}`;
    }

    static register(instance: Serializable): void {
        if (!instance.class || !instance.id) return;
        const key = LiveModelRegistry.keyFor(instance.class, instance.id);
        if (LiveModelRegistry.#registeredUnder.get(instance) === key) return;
        LiveModelRegistry.#registeredUnder.set(instance, key);
        const refs = LiveModelRegistry.#instances.get(key) ?? [];
        refs.push(new WeakRef(instance));
        LiveModelRegistry.#instances.set(key, refs);
        LiveModelRegistry.#finalizer.register(instance, key);
    }

    /**
     * A nested instance is owned by the relation that hydrated it, so a live-sync refetch must
     * skip it: its parent replaces it wholesale on the next `fromJson`. Refetching it instead
     * re-hydrates its own relations, and for any payload that embeds its own class and id
     * (`project.companys_active_projects` contains the project itself) each pass triples the
     * registered copies, so the next broadcast triples again.
     */
    static markNested(instance: Serializable): void { LiveModelRegistry.#nested.add(instance); }
    static isNested(instance: Serializable): boolean { return LiveModelRegistry.#nested.has(instance); }

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
