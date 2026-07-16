<?php

namespace App\Http\Requests\Stats;

use Illuminate\Foundation\Http\FormRequest;

class QuoteAccuracyRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'startDate' => 'required|date',
            'endDate'   => 'required|date',
        ];
    }
}
