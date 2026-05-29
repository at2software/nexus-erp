<?php

namespace App\Http\Requests\Vacation;

use App\Models\VacationGrant;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreManualRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'started_at'        => 'required|date',
            'vacation_grant_id' => [
                'required',
                function (string $att, mixed $val, Closure $fail) {
                    if (! ($v = VacationGrant::find($val))) {
                        $fail('no valid grant pool');
                    }
                },
            ],
        ];
    }
}
