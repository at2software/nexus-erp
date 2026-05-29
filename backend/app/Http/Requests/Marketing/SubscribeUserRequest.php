<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class SubscribeUserRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|in:owner,member',
        ];
    }
}
