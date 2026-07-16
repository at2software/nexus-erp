<?php

namespace Tests\Support;

use App\Traits\CustomModelTrait;
use Illuminate\Database\Eloquent\Model;

class FakeMassAssignmentModel extends Model {
    use CustomModelTrait;

    protected $table    = 'fake_mass_assignment_models';
    protected $fillable = ['safe'];
    protected $hidden   = ['hidden_only'];
    public $timestamps  = false;

    public function getVirtualColumns() {
        return [];
    }
}
