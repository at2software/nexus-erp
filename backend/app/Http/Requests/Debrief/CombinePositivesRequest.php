<?php

namespace App\Http\Requests\Debrief;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CombinePositivesRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'ids'   => 'required|array|min:2',
            'ids.*' => [Rule::exists('debrief_positives', 'id')->whereNull('deleted_at')],
            'title' => 'required|string|max:255',
        ];
    }
}
