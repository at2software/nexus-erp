<?php

namespace App\Traits;

trait HasQuoteDescriptionsTrait {
    public function getQuoteDescriptions(): array {
        $descriptions = [];
        $groups       = collect();
        $sources      = $this->invoiceItems()
            ->whereNotNull('product_source_id')
            ->with('productSource.group')
            ->groupBy('product_source_id')
            ->get();

        foreach ($sources as $item) {
            $descriptions[] = $item->productSource->quote;
            $groups         = $groups->merge($item->productSource->trace());
        }

        $groups = $groups->unique();
        foreach ($groups as $group) {
            $descriptions[] = $group->quote;
        }
        return array_values(array_filter($descriptions, fn ($x) => strlen($x)));
    }
}
