<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\MorphTo;

class DeletionRequest extends BaseModel {
    protected $fillable = ['user_id', 'model_type', 'model_id', 'reason'];

    public function user() {
        return $this->belongsTo(User::class);
    }
    public function model(): MorphTo {
        return $this->morphTo();
    }

    /** Approve the request: delete the target, then remove the request itself. */
    public function approve(): void {
        $this->model?->delete();
        $this->delete();
    }
}
