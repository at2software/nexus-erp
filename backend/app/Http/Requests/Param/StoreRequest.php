<?php

namespace App\Http\Requests\Param;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'value' => 'required',
        ];
    }
}
