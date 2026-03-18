<?php

namespace App\Http\Controllers;

use App\Models\Cash;
use App\Models\CashRegister;
use App\Traits\ControllerHasPermissionsTrait;

class CashController extends Controller {
    use ControllerHasPermissionsTrait;

    public function indexRegisters() {
        return CashRegister::get();
    }
    public function indexEntries(CashRegister $_) {
        return $_->entries->sortByDesc('occured_at')->values()->toArray();
    }
    public function storeEntry(CashRegister $_) {
        $body = (array)$this->getBody();
        $_->entries()->create($body);
    }
    public function destroyEntry(Cash $_) {
        $_->delete();
    }
}
