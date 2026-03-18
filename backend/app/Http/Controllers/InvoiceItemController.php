<?php

namespace App\Http\Controllers;

use App\Enums\InvoiceItemType;
use App\Models\Focus;
use App\Models\InvoiceItem;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceItemController extends Controller {
    use ControllerHasPermissionsTrait;

    public function permissionsMiddleware() {
        return 'permission_invoiceItem';
    }
    public function indexStandingOrders() {
        $q = InvoiceItem::whereIn('type', InvoiceItemType::Repeating)->whereNot('next_recurrence_at', null)->with('company')->oldest('next_recurrence_at');
        if (request()->has('company_id')) {
            $q->whereCompanyId(request('company_id'));
        }
        return $q->get();
    }
    public function destroy(InvoiceItem $invoiceItem) {
        return $invoiceItem->delete();
    }
    public function store(Request $request) {
        return InvoiceItem::create((new InvoiceItem)->getValidFields($request->all()))->fresh();
    }
    public function update(Request $request, int $id) {
        $item = InvoiceItem::findOrFail($id);
        $item->applyAndSaveRequest();
        return $item->fresh();
    }
    public function show(int $id) {
        return InvoiceItem::findOrFail($id);
    }
    public function reorder(Request $request) {
        $data = json_decode($request->getContent());
        foreach ($data->order as $key => $id) {
            $invoiceItem = InvoiceItem::find($id);
            if ($invoiceItem && $invoiceItem->position != $key) {
                $invoiceItem->position = $key;
                $invoiceItem->save();
            }
        }
    }

    /**
     * Combine multiple invoice items into a single item.
     * Reassigns all associated foci to the new combined item.
     */
    public function combine(Request $request) {
        $request->validate([
            'item_ids'    => 'required|array|min:2',
            'item_ids.*'  => 'required|integer|exists:invoice_items,id',
            'description' => 'required|string',
        ]);

        $itemIds     = $request->input('item_ids');
        $description = $request->input('description');

        $items = InvoiceItem::whereIn('id', $itemIds)->get();

        if ($items->count() < 2) {
            return response()->json(['error' => 'At least 2 items are required'], 422);
        }

        // Validate all items have same price and unit_name
        $firstItem = $items->first();
        foreach ($items as $item) {
            if ($item->price !== $firstItem->price || $item->unit_name !== $firstItem->unit_name) {
                return response()->json(['error' => 'All items must have the same price and unit name'], 422);
            }
        }

        return DB::transaction(function () use ($items, $itemIds, $description, $firstItem) {
            // Calculate combined quantity
            $combinedQty = $items->sum('qty');

            // Create the new combined item using first item as template
            $combined = InvoiceItem::create([
                'text'              => $description,
                'price'             => $firstItem->price,
                'qty'               => $combinedQty,
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

            // Reassign all foci to the new combined item
            Focus::whereIn('invoiced_in_item_id', $itemIds)->update(['invoiced_in_item_id' => $combined->id]);

            // Delete the original items
            InvoiceItem::whereIn('id', $itemIds)->delete();

            return $combined->fresh();
        });
    }
}
