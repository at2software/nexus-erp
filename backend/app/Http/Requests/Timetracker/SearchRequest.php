<?php

namespace App\Http\Requests\Timetracker;

use Illuminate\Foundation\Http\FormRequest;

class SearchRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'q' => 'required',
        ];
    }
}
