<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class WorkflowRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        $isStore = $this->isMethod('POST');
        $req     = $isStore ? 'required' : 'sometimes';

        $rules = [
            'name'        => "$req|string|max:255",
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
        ];

        if ($isStore) {
            $rules += [
                'activities'                => 'array',
                'activities.*.day_offset'   => 'required|integer|min:1',
                'activities.*.description'  => 'nullable|string',
                'activities.*.is_required'  => 'boolean',
                'activities.*.metric_ids'   => 'array',
                'activities.*.metric_ids.*' => 'exists:marketing_performance_metrics,id',
            ];
        }

        return $rules;
    }
}
