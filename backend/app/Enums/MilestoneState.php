<?php

namespace App\Enums;

enum MilestoneState: int {
    case TODO        = 0;
    case IN_PROGRESS = 1;
    case DONE        = 2;

    public function getName(): string {
        return match ($this) {
            self::TODO        => 'To Do',
            self::IN_PROGRESS => 'In Progress',
            self::DONE        => 'Done'
        };
    }
    public function getColor(): string {
        return match ($this) {
            self::TODO        => '#6c757d',        // grey
            self::IN_PROGRESS => '#0d6efd', // primary
            self::DONE        => '#198754'         // success
        };
    }
    public static function all(): array {
        return [
            self::TODO,
            self::IN_PROGRESS,
            self::DONE,
        ];
    }
}
