<?php

namespace App\Actions\Project;

use App\Enums\InvoiceItemType;
use App\Models\Param;
use App\Models\Project;

class ConvertInvoiceItemsToMilestonesAction {
    public function execute(Project $project): array {
        $allInvoiceItems      = $project->invoiceItems;
        $unlinkedInvoiceItems = $project->invoiceItems()->whereType(InvoiceItemType::Default)->whereDoesntHave('milestones')->get();

        if ($unlinkedInvoiceItems->isEmpty()) {
            return [
                'message'            => 'No unlinked invoice items found to convert',
                'milestones_created' => 0,
                'debug_info'         => [
                    'project_id'           => $project->id,
                    'total_invoice_items'  => $allInvoiceItems->count(),
                    'already_linked_items' => $allInvoiceItems->count() - $unlinkedInvoiceItems->count(),
                ],
            ];
        }

        $conversionFactor  = Param::get('MILESTONE_CONVERSION_FACTOR')->value;
        $hoursPerDay       = Param::get('INVOICE_HPD')->value;
        $createdMilestones = [];
        $maxPosition       = $project->milestones()->max('position') ?? -1;

        foreach ($unlinkedInvoiceItems as $index => $invoiceItem) {
            $estimatedDays = $invoiceItem->assumedWorkload() / $hoursPerDay ?? 1;
            $dueDelta      = max(1, ceil($estimatedDays * $conversionFactor));
            $dueAt         = now()->addDays($dueDelta);

            $milestone = $project->milestones()->create([
                'name'       => $invoiceItem->text,
                'started_at' => now()->toDateString(),
                'due_at'     => $dueAt,
                'duration'   => $estimatedDays,
                'progress'   => $invoiceItem->progress * 100 ?? 0,
                'state'      => 0,
                'position'   => $maxPosition + $index + 1,
            ]);

            $milestone->invoiceItems()->attach($invoiceItem->id);
            $createdMilestones[] = $milestone->load('invoiceItems');
        }

        return [
            'message'            => 'Successfully converted invoice items to milestones',
            'milestones_created' => count($createdMilestones),
            'milestones'         => $createdMilestones,
        ];
    }
}
