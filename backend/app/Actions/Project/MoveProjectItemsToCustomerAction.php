<?php

namespace App\Actions\Project;

use App\Enums\InvoiceItemType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Project;

class MoveProjectItemsToCustomerAction {
    public function execute(Project $project, $itemsQuery, array $itemUpdates = []): void {
        Invoice::disablePropagation();

        $maxPos = $project->company->invoiceItems()->max('position') ?? 0;

        InvoiceItem::create([
            'company_id' => $project->company->id,
            'position'   => ++$maxPos,
            'type'       => InvoiceItemType::Header,
            'text'       => ($project->po_number ? $project->po_number.' ' : '').$project->name,
        ]);

        $itemsQuery->get()->each(function ($item) use (&$maxPos, $itemUpdates, $project) {
            $item->update([
                'company_id' => $project->company_id,
                'position'   => ++$maxPos,
                ...$itemUpdates,
            ]);
        });

        Invoice::enablePropagation();
        $project->propagateDirty();
    }
}
