import { ApplicationRef, Injectable, NgZone, inject } from '@angular/core';
import { WebSocketService, DataChangedPayload } from 'src/services/websocket.service';
import { GlobalService } from './global.service';
import { LiveModelRegistry } from './live-model-registry';
import { Serializable } from './serializable';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const DEBOUNCE_MS = 300;
const BLUR_RECHECK_MS = 500;

interface PendingApply {
    instances: Serializable[];
    json: unknown;
}

/**
 * Keeps every live-registered Serializable instance fresh: one refetch per
 * class:id per backend event, applied in place to every instance that
 * represents that row (see LiveModelRegistry). Deferred while the user is
 * typing so a remote update can't clobber unsaved input.
 */
@Injectable({ providedIn: 'root' })
export class LiveSyncService {
    #ws = inject(WebSocketService);
    #global = inject(GlobalService);
    #zone = inject(NgZone);
    #appRef = inject(ApplicationRef);

    #debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    #pending = new Map<string, PendingApply>();
    #blurWatchActive = false;
    #tickScheduled = false;

    constructor() {
        this.#ws.dataChanged$.subscribe((payload) => this.#onEvent(payload));
    }

    #onEvent(payload: DataChangedPayload): void {
        if (String(payload.actorId) === String(this.#global.user?.id ?? '')) return;

        const key = LiveModelRegistry.keyFor(payload.class, payload.id);
        const existing = this.#debounceTimers.get(key);
        if (existing) clearTimeout(existing);
        this.#debounceTimers.set(
            key,
            setTimeout(() => {
                this.#debounceTimers.delete(key);
                this.#process(payload);
            }, DEBOUNCE_MS),
        );
    }

    #process(payload: DataChangedPayload): void {
        const instances = LiveModelRegistry.lookup(payload.class, payload.id);
        if (!instances.length) return;

        // No central record of which [nx]/[tables]-bound arrays hold a given instance,
        // so there's no reasonable generic hook to auto-remove a deleted row - no-op.
        if (payload.event === 'deleted') return;

        const key = LiveModelRegistry.keyFor(payload.class, payload.id);
        const [sample] = instances;
        sample.httpService.get(sample.apiPathWithId()).subscribe((json) => this.#applyOrDefer(key, instances, json));
    }

    #applyOrDefer(key: string, instances: Serializable[], json: unknown): void {
        if (this.#isEditing()) {
            this.#pending.set(key, { instances, json });
            this.#armBlurWatch();
            return;
        }
        this.#commit(instances, json);
    }

    #commit(instances: Serializable[], json: unknown): void {
        for (const instance of instances) {
            instance.fromJson(json);
            LiveModelRegistry.notifyUpdated(instance);
        }
        this.#scheduleTick();
    }

    #isEditing(): boolean {
        const active = document.activeElement;
        if (!active) return false;
        return EDITABLE_TAGS.has(active.tagName) || active.hasAttribute('contenteditable');
    }

    // Global check is intentional - re-checked on blur/focusout rather than tracked per row.
    #armBlurWatch(): void {
        if (this.#blurWatchActive) return;
        const target = document.activeElement;
        if (!target) {
            this.#flushPending();
            return;
        }

        this.#blurWatchActive = true;
        const onBlur = () => {
            target.removeEventListener('blur', onBlur);
            target.removeEventListener('focusout', onBlur);
            setTimeout(() => {
                this.#blurWatchActive = false;
                // the user may have tabbed straight into another field - keep deferring
                if (this.#isEditing()) this.#armBlurWatch();
                else this.#flushPending();
            }, BLUR_RECHECK_MS);
        };
        target.addEventListener('blur', onBlur, { once: true });
        target.addEventListener('focusout', onBlur, { once: true });
    }

    #flushPending(): void {
        const entries = [...this.#pending.values()];
        this.#pending.clear();
        entries.forEach(({ instances, json }) => this.#commit(instances, json));
    }

    // nx runs outside the Angular zone and views are OnPush - batch applies into one tick.
    #scheduleTick(): void {
        if (this.#tickScheduled) return;
        this.#tickScheduled = true;
        queueMicrotask(() => {
            this.#tickScheduled = false;
            this.#zone.run(() => this.#appRef.tick());
        });
    }
}
