<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class StoreInitiativeChannelRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'lead_source_id'  => 'required|exists:lead_sources,id',
            'is_primary'      => 'boolean',
            'custom_settings' => 'nullable|array',
        ];
    }
}
