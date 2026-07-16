<?php

namespace App\Support;

use App\Events\DataChanged;
use Illuminate\Support\Facades\Auth;

/**
 * Dedupes DataChanged broadcasts within a single request. BaseModel's generic
 * saved/deleted hooks call add() instead of firing the event directly - bulk
 * operations (creating an invoice from N items, $touches cascades, etc.) would
 * otherwise fire many identical synchronous broadcasts. Tuples are collected and
 * flushed once via app()->terminating(), after the response has been sent.
 */
class LiveSyncBroadcaster {
    /** @var array<string, array{class: string, id: string|int, event: string, actorId: int}> */
    private array $pending = [];
    private bool $flushRegistered = false;

    /** @param \Illuminate\Database\Eloquent\Model $model any BaseModel instance */
    public static function dispatchFor($model, string $event): void {
        $actorId = Auth::id() ?? 0;
        app(self::class)->add($model->getClassAttribute(), $model->getKey(), $event, $actorId);
    }

    public function add(string $class, string|int $id, string $event, int $actorId): void {
        // terminating() is unreliable outside HTTP (tinker/psysh never runs it, queue
        // workers only on shutdown) - dispatch directly there, dedupe is an HTTP concern
        if (app()->runningInConsole()) {
            event(new DataChanged($class, $id, $event, $actorId));
            return;
        }

        $this->pending[$class.':'.$id.':'.$event.':'.$actorId] = [
            'class'   => $class,
            'id'      => $id,
            'event'   => $event,
            'actorId' => $actorId,
        ];

        if (! $this->flushRegistered) {
            $this->flushRegistered = true;
            app()->terminating(function () {
                $this->flush();
            });
        }
    }

    public function flush(): void {
        // flushRegistered stays true: re-registering the terminating callback per
        // flush would let callbacks pile up in long-running workers.
        foreach ($this->pending as $tuple) {
            event(new DataChanged($tuple['class'], $tuple['id'], $tuple['event'], $tuple['actorId']));
        }
        $this->pending = [];
    }
}
