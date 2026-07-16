<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DataChanged implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly string $class,
        public readonly string|int $id,
        public readonly string $event,
        public readonly int $actorId
    ) {}

    public function broadcastOn(): PresenceChannel {
        return new PresenceChannel('live-sharing');
    }
    public function broadcastAs(): string {
        return 'data.changed';
    }
}
