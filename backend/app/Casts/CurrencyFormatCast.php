<?php

namespace App\Casts;

use App\Models\Param;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class CurrencyFormatCast implements CastsAttributes {
    private static ?string $_currency = null;

    public function get($model, string $key, $value, array $attributes) {
        return $value;
    }
    public function set($model, string $key, $value, array $attributes) {
        return $value;
    }
    public static function format($value): string {
        if (self::$_currency === null) {
            self::$_currency = Param::get('SYS_CURRENCY')->value;
        }
        return number_format($value, 2, ',', '.').' '.self::$_currency;
    }
}
