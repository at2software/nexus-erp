<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class InitiativeRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        $isStore = $this->isMethod('POST');
        $req     = $isStore ? 'required' : 'sometimes';

        $rules = [
            'name'        => "$req|string|max:255",
            'parent_id'   => 'nullable|exists:marketing_initiatives,id',
            'description' => 'nullable|string',
            'status'      => 'in:active,paused,completed',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
        ];

        if ($isStore) {
            $rules += [
                'channels'                   => 'array',
                'channels.*.lead_source_id'  => 'required|exists:lead_sources,id',
                'channels.*.is_primary'      => 'boolean',
                'channels.*.custom_settings' => 'nullable|array',
            ];
        }

        return $rules;
    }
}
