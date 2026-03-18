<?php

namespace App\Builders;

class InvoiceItemBuilder extends BaseBuilder {
    public function indexed() {
        return $this->load('productSource');
    }
    public function onlyActive() {
        return $this->whereRaw('active LIKE "active"');
    }
}
