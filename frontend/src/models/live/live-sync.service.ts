import { ApplicationRef, inject, Service } from '@angular/core';
import { Subject } from 'rxjs';
import { WebSocketService, DataChangedPayload } from '@services/websocket.service';
import { GlobalService } from '../global.service';
import { LiveModelRegistry } from '@models/live/live-model-registry';
import { Serializable } from '@models/_core/serializable';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const DEBOUNCE_MS = 300;
const BLUR_RECHECK_MS = 500;

interface PendingApply {
    instances: Serializable[];
    json: unknown;
    payload: DataChangedPayload;
}

@Service()
export class LiveSyncService {
    #ws = inject(WebSocketService);
    #global = inject(GlobalService);
    #appRef = inject(ApplicationRef);

    #debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    #pending = new Map<string, PendingApply>();
    #pendingSignals = new Map<string, DataChangedPayload>();
    #blurWatchActive = false;
    #tickScheduled = false;

    readonly #externalChanges = new Subject<DataChangedPayload>();
    readonly externalChanges$ = this.#externalChanges.asObservable();

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
        const key = LiveModelRegistry.keyFor(payload.class, payload.id);

        const instances = payload.event === 'deleted' ? [] : LiveModelRegistry.lookup(payload.class, payload.id);
        if (!instances.some((_) => _.liveSyncEnabled)) {
            this.#signalOrDefer(key, payload);
            return;
        }

        const targets = instances.filter((_) => _.liveSyncEnabled || !LiveModelRegistry.isNested(_));
        const [sample] = targets;
        sample.httpService.get(sample.apiPathWithId()).subscribe({
            next: (json) => this.#applyOrDefer(key, targets, json, payload),
            error: () => this.#signalOrDefer(key, payload),
        });
    }

    #applyOrDefer(key: string, instances: Serializable[], json: unknown, payload: DataChangedPayload): void {
        if (this.#isEditing()) {
            this.#pending.set(key, { instances, json, payload });
            this.#armBlurWatch();
            return;
        }
        this.#commit(instances, json, payload);
    }

    #signalOrDefer(key: string, payload: DataChangedPayload): void {
        if (this.#isEditing()) {
            this.#pendingSignals.set(key, payload);
            this.#armBlurWatch();
            return;
        }
        this.#externalChanges.next(payload);
    }

    #commit(instances: Serializable[], json: unknown, payload: DataChangedPayload): void {
        for (const instance of instances) {
            instance.fromJson(json);
            LiveModelRegistry.notifyUpdated(instance);
        }
        this.#externalChanges.next(payload);
        this.#scheduleTick();
    }

    #isEditing(): boolean {
        const active = document.activeElement;
        if (!active) return false;
        return EDITABLE_TAGS.has(active.tagName) || active.hasAttribute('contenteditable');
    }

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
        entries.forEach(({ instances, json, payload }) => this.#commit(instances, json, payload));

        const signals = [...this.#pendingSignals.values()];
        this.#pendingSignals.clear();
        signals.forEach((payload) => this.#externalChanges.next(payload));
    }

    #scheduleTick(): void {
        if (this.#tickScheduled) return;
        this.#tickScheduled = true;
        queueMicrotask(() => {
            this.#tickScheduled = false;
            this.#appRef.tick();
        });
    }
}
