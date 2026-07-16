<?php

namespace App\Http\Requests\Timetracker;

use Illuminate\Foundation\Http\FormRequest;

class ParentRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'project_id' => 'required_without_all:company_id|exists:App\Models\Project,id',
            'company_id' => 'required_without_all:project_id|exists:App\Models\Company,id',
        ];
    }
}
