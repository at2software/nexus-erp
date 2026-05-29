<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class AttachWorkflowRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'marketing_workflow_id' => 'required|exists:marketing_workflows,id',
            'is_active'             => 'boolean',
        ];
    }
}
