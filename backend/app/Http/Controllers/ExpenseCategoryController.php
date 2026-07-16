<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExpenseCategory\StoreRequest;
use App\Http\Requests\ExpenseCategory\UpdateRequest;
use App\Models\ExpenseCategory;

class ExpenseCategoryController extends Controller {
    public function index() {
        return ExpenseCategory::all();
    }
    public function store(StoreRequest $request) {
        $category = ExpenseCategory::create($request->validated());
        return response($category, 201);
    }
    public function show(int $id) {
        $category = ExpenseCategory::findOrFail($id);
        return response($category, 200);
    }
    public function update(UpdateRequest $request, int $id) {
        $category = ExpenseCategory::findOrFail($id);
        $category->update($request->validated());
        return response($category, 200);
    }
    public function destroy(int $id) {
        $category = ExpenseCategory::findOrFail($id);
        $category->delete();
        return response(null, 204);
    }
}
