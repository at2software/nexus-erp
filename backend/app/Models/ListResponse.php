<?php

namespace App\Models;

class ListResponse {
    public static function make(string $type, string $title, string $label, string $badge, string $color, $id = null) {
        return [
            'type'  => $type,
            'title' => $title,
            'label' => $label,
            'badge' => $badge,
            'color' => $color,
            'id'    => $id,
        ];
    }
}
