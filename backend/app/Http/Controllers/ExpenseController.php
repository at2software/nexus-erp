<?php

namespace App\Http\Controllers;

use App\Enums\InvoiceItemType;
use App\Models\Expense;
use App\Traits\ControllerHasPermissionsTrait;

class ExpenseController extends Controller {
    use ControllerHasPermissionsTrait;

    public static function VALIDATE_PAYLOAD() {
        request()->validate([
            'category_id' => 'numeric',
            'name'        => 'string',
            'price'       => 'numeric',
            'repeat'      => 'in:'.implode(',', InvoiceItemType::Repeating),
        ]);
    }
    public function index() {
        return Expense::all();
    }
    public function store() {
        self::VALIDATE_PAYLOAD();
        $expense = Expense::create();
        return $expense->applyAndSave(request());
    }
    public function update(Expense $expense) {
        self::VALIDATE_PAYLOAD();
        return $expense->applyAndSave(request());
    }
    public function destroy(Expense $expense) {
        $expense->delete();
    }
}
