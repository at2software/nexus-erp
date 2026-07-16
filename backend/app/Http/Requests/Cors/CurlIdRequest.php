<?php

namespace App\Http\Requests\Cors;

use Illuminate\Foundation\Http\FormRequest;

class CurlIdRequest extends FormRequest {
    public function authorize(): bool {
        return true;
    }
    public function rules(): array {
        return [
            'method' => 'required|in:get,post,put,delete,patch',
            'url'    => 'required|url',
            'idKey'  => 'required|string',
        ];
    }
}
