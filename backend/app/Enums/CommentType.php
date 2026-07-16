<?php

namespace App\Enums;

enum CommentType: int {
    case Default = 0;
    case Info    = 1;
    case Warning = 2;
    case Notice  = 3;

    public static function asArray(): array {
        return array_column(self::cases(), 'value', 'name');
    }
}
