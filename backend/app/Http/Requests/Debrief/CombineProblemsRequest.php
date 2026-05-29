<?php

namespace App\Http\Requests\Debrief;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CombineProblemsRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'keep_id'     => ['required', Rule::exists('debrief_problems', 'id')->whereNull('deleted_at')],
            'merge_ids'   => 'required|array|min:1',
            'merge_ids.*' => [Rule::exists('debrief_problems', 'id')->whereNull('deleted_at')],
            'title'       => 'required|string|max:255',
        ];
    }
}
