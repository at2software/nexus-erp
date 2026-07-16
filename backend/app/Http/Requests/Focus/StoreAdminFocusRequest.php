<?php

namespace App\Http\Requests\Focus;

use Illuminate\Foundation\Http\FormRequest;

class StoreAdminFocusRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'date'        => 'required|date',
            'user_id'     => 'required|exists:App\Models\User,id',
            'duration'    => 'required|numeric',
            'parent_path' => 'nullable|string',
        ];
    }
}
