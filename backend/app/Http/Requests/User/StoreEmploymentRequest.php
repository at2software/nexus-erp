<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmploymentRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'user_id'       => 'exists:App\Models\User,id',
            'mo'            => 'required|numeric',
            'tu'            => 'required|numeric',
            'we'            => 'required|numeric',
            'th'            => 'required|numeric',
            'fr'            => 'required|numeric',
            'sa'            => 'required|numeric',
            'su'            => 'required|numeric',
            'is_time_based' => 'required|boolean',
            'started_at'    => 'required|date',
        ];
    }
}
