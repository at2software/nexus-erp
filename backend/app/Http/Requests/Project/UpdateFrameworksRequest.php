<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFrameworksRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'url'           => 'required|string',
            'is_deprecated' => 'sometimes|boolean',
        ];
    }
}
