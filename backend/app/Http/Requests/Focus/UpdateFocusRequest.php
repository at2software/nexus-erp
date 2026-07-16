<?php

namespace App\Http\Requests\Focus;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFocusRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'started_at'  => 'sometimes|date',
            'duration'    => 'sometimes|numeric',
            'parent_path' => 'poly_exists:parent_id,parent_type',
        ];
    }
}
