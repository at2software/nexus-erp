<?php

namespace App\Models;

use App\Casts\I18n;
use App\Traits\HasI18nTrait;
use App\Traits\ParamDataTrait;

class TextParam extends BaseModel {
    use HasI18nTrait, ParamDataTrait;

    protected $fillable = ['created_at', 'updated_at', 'value', 'parent_id', 'parent_type', 'language', 'param_id'];
    protected $hidden   = ['created_at', 'updated_at'];
    protected $access   = ['admin' => '*', 'project_manager'=>'cru', 'user'=>'cru'];
    protected $casts    = [
        'value' => I18n::class,
    ];
}
