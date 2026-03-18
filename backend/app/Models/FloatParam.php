<?php

namespace App\Models;

use App\Traits\ParamDataTrait;

class FloatParam extends BaseModel {
    use ParamDataTrait;

    protected $fillable = ['created_at', 'updated_at', 'value', 'parent_id', 'parent_type', 'language', 'param_id'];
    protected $hidden   = ['created_at', 'updated_at'];
    protected $casts    = ['value'=>'double'];
    protected $access   = ['admin' => '*', 'project_manager'=>'cru', 'user'=>'cru'];
}
