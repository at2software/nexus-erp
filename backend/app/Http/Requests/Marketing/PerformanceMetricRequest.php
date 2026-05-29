<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class PerformanceMetricRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        $req = $this->isMethod('POST') ? 'required' : 'sometimes';
        return [
            'name'         => "$req|string|max:255",
            'description'  => 'nullable|string',
            'metric_type'  => "$req|in:counter,percentage,conversion,currency,duration",
            'target_value' => 'nullable|numeric|min:0',
            'kpi_icon'     => 'nullable|string|max:100',
            'kpi_color'    => 'nullable|string|max:50',
        ];
    }
}
