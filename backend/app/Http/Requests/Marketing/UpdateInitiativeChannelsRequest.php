<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInitiativeChannelsRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'channels'                   => 'required|array',
            'channels.*.lead_source_id'  => 'required|exists:lead_sources,id',
            'channels.*.is_primary'      => 'boolean',
            'channels.*.custom_settings' => 'nullable|array',
        ];
    }
}
