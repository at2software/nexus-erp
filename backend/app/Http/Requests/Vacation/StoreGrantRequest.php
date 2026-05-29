<?php

namespace App\Http\Requests\Vacation;

use Illuminate\Foundation\Http\FormRequest;

class StoreGrantRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'user_id'    => 'required|exists:App\Models\User,id',
            'name'       => 'required|string',
            'expires_at' => 'required|date',
            'amount'     => 'required|numeric|gt:0',
        ];
    }
}
