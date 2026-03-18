<?php

namespace App\Traits;

trait HasVcardBuilder {
    public function whereHasBirthday() {
        return $this->whereRaw('vcard REGEXP ?', ['(?i)(^|\n)BDAY.*($|\n)']);
    }
    public function whereMissingBirthday() {
        return $this->whereRaw('vcard NOT REGEXP ?', ['(?i)(^|\n)BDAY.*($|\n)']);
    }
}
