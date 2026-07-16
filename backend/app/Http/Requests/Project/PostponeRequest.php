<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class PostponeRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'duration' => 'required|numeric|in:1,2,3,4,5,6,7',
            'comment'  => 'sometimes|nullable|string',
        ];
    }
}
