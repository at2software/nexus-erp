<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;

class ExpenseCategoryController extends Controller {

    public function store() {
        $attributes = request()->validate(['name' => 'required|string|max:255']);
        $category = ExpenseCategory::create([
            'name' => $attributes['name'],
        ]);
        return response($category, 201);
    }

    public function show($id) {
        $category = ExpenseCategory::findOrFail($id);
        return response($category, 200);
    }

    public function update($id) {
        $attributes = request()->validate([
            'name' => 'required|string|max:255',
        ]);

        $category = ExpenseCategory::findOrFail($id);
        $category->update($attributes);

        return response($category, 200);
    }

    public function destroy($id) {
        $category = ExpenseCategory::findOrFail($id);
        $category->delete();

        return response(null, 204);
    }
}
