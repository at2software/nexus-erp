<?php

namespace App\Actions;

use App\Models\Focus;
use App\Models\InvoiceItem;
use Illuminate\Support\Facades\DB;

class CombineInvoiceItemsAction {
    public function execute(array $itemIds, string $description): InvoiceItem {
        $items     = InvoiceItem::whereIn('id', $itemIds)->get();
        $firstItem = $items->first();
        return DB::transaction(function () use ($items, $itemIds, $description, $firstItem) {
            $combined = InvoiceItem::create([
                'text'              => $description,
                'price'             => $firstItem->price,
                'qty'               => $items->sum('qty'),
                'unit_name'         => $firstItem->unit_name,
                'vat_rate'          => $firstItem->vat_rate,
                'vat_calculation'   => $firstItem->vat_calculation,
                'discount'          => $firstItem->discount,
                'type'              => $firstItem->type,
                'position'          => $firstItem->position,
                'project_id'        => $firstItem->project_id,
                'company_id'        => $firstItem->company_id,
                'invoice_id'        => $firstItem->invoice_id,
                'product_id'        => $firstItem->product_id,
                'product_source_id' => $firstItem->product_source_id,
            ]);

            Focus::whereIn('invoiced_in_item_id', $itemIds)->update(['invoiced_in_item_id' => $combined->id]);
            InvoiceItem::whereIn('id', $itemIds)->delete();
            return $combined->fresh();
        });
    }
}
