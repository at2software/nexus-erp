<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class I18n extends Model {
    protected $table    = 'i18n';
    protected $fillable = [
        'parent_type',
        'parent_id',
        'language',
        'formality',
        'text',
    ];

    public function parent(): MorphTo {
        return $this->morphTo();
    }
}
