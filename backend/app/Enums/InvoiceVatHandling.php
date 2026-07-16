<?php

namespace App\Enums;

enum InvoiceVatHandling: int {
    case Net   = 0;
    case Gross = 1;

    public static function asArray(): array {
        return array_column(self::cases(), 'value', 'name');
    }
}
