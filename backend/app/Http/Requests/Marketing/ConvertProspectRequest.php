<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class ConvertProspectRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'company_id'   => 'nullable|exists:companies,id',
            'create_new'   => 'required|boolean',
            'company_name' => 'nullable|string',
        ];
    }
}
