<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class StoreProspectFromAddonRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'marketing_initiative_id' => 'required|exists:marketing_initiatives,id',
            'lead_source_id'          => 'required|exists:lead_sources,id',
            'vcard'                   => 'required|string',
            'external_data'           => 'nullable|array',
        ];
    }
}
