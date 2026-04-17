<?php

namespace App\Traits;

use App\Models\Invoice;

trait CanMakeInvoiceTrait {
    public function makeInvoiceFor($nonPersistantItems = null) {
        return Invoice::makeInvoiceFor($this, $nonPersistantItems);
    }
}
