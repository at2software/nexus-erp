<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class CreateTbeRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'paid_at'  => 'required|date',
            'raw'      => 'required|numeric',
            'vacation' => 'required|numeric',
        ];
    }
}
