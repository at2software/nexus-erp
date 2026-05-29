<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class StoreMetricRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'marketing_initiative_id' => 'required|exists:marketing_initiatives,id',
            'name'                    => 'required|string|max:255',
            'metric_type'             => 'required|in:counter,percentage,conversion,currency,duration',
            'target_value'            => 'nullable|numeric|min:0',
            'is_inherited'            => 'boolean',
        ];
    }
}
