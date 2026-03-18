<?php

namespace App\Http\Controllers;

use App\Models\Encryption;
use App\Traits\ControllerHasPermissionsTrait;

class EncryptionController extends Controller {
    use ControllerHasPermissionsTrait;

    public function encrypt() {
        $data = (array)($this->getBody());
        $enc  = Encryption::create([
            'key'     => $data['key'],
            'value'   => $data['data'],
            'user_id' => request()->user()->id,
        ]);
        $enc->save();
        return $enc;
    }
    public function update(int $id) {
        return Encryption::findOrFail($id)->applyAndSave(request());
    }
    public function destroy(int $id) {
        return Encryption::findOrFail($id)->delete();
    }
}
