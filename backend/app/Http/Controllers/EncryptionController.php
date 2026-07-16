<?php

namespace App\Http\Controllers;

use App\Models\Encryption;

class EncryptionController extends Controller {
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
    public function update(Encryption $encryption) {
        return $encryption->applyAndSave(request());
    }
    public function destroy(Encryption $encryption) {
        return $encryption->delete();
    }
}
