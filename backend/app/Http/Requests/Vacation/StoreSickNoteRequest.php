<?php

namespace App\Http\Requests\Vacation;

use Illuminate\Foundation\Http\FormRequest;

class StoreSickNoteRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'started_at' => 'required|date',
            'ended_at'   => 'required|date',
            'comment'    => 'string',
            'user_id'    => 'nullable|exists:App\Models\User,id',
        ];
    }
}
