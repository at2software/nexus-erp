<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'name'                  => 'required_without_all:first_name,family_name|nullable|string|max:255',
            'first_name'            => 'sometimes|nullable|string|max:255',
            'family_name'           => 'sometimes|nullable|string|max:255',
            'email'                 => 'required|email|unique:users,email',
            'password'              => 'required|string|min:8',
            'employment.type'       => 'sometimes|string',
            'employment.hpw'        => 'sometimes|numeric',
            'employment.started_at' => 'sometimes|date',
        ];
    }
}
