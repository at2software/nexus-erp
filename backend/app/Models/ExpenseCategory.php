<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ExpenseCategory extends BaseModel {
    use HasFactory;

    protected $access = ['admin' => '*', 'project_manager'=>'', 'user'=>''];

    public function category() {
        return $this->hasMany(Expense::class);
    }
}
