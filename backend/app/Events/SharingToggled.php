<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class SharingToggled implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $userId,
        public string $userName,
        public string $userColor,
        public bool $enabled,
        public string $url
    ) {}

    public function broadcastOn(): PresenceChannel {
        return new PresenceChannel('live-sharing');
    }
    public function broadcastAs(): string {
        return 'sharing.toggled';
    }
}
