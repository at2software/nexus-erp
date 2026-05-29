<?php

namespace App\Http\Requests\Debrief;

use Illuminate\Foundation\Http\FormRequest;

class ProblemRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        $req = $this->isMethod('POST') ? 'required' : 'sometimes';
        return [
            'title'                       => "$req|string|max:255",
            'description'                 => 'nullable|string',
            'debrief_problem_category_id' => "$req|exists:debrief_problem_categories,id",
        ];
    }
}
