<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ExpenseCategory extends BaseModel {
    use HasFactory;

    protected $fillable = ['name'];

    public function category() {
        return $this->hasMany(Expense::class);
    }
}
