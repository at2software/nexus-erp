<?php

namespace App\Console\Commands\Cronjobs;

use App\Enums\InvoiceItemType;
use App\Models\InvoiceItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class StandingOrders extends Command {
    protected $signature   = 'cron:standing-orders';
    protected $description = 'Command description';
    protected $output;

    private function logToFile($message) {
        $timestamp  = now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}".PHP_EOL;
        Storage::append('cronjobs-standing-orders.log', $logMessage);
    }
    public function handle() {
        $this->logToFile('=== StandingOrders Cronjob Started ===');

        $query = InvoiceItem::whereIn('type', InvoiceItemType::Repeating)
            ->whereNotNull('next_recurrence_at')
            ->where('next_recurrence_at', '<', now());

        $this->logToFile('Executing query: '.$query->toSql());
        $this->logToFile('With bindings: '.json_encode($query->getBindings()));
        $this->logToFile('InvoiceItemType::Repeating contains: '.json_encode(InvoiceItemType::Repeating));

        $recurringItems = $query->get();

        $this->logToFile('Found '.$recurringItems->count().' recurring items to process at '.now());

        foreach ($recurringItems as $item) {
            $this->logToFile("Processing item ID: {$item->id}, Type: {$item->type}, Next recurrence: {$item->next_recurrence_at}, Text: ".substr($item->text, 0, 50));

            // Store original values for debugging
            $original_next_recurrence = $item->next_recurrence_at->copy();
            $this->logToFile("  Original next_recurrence_at: {$original_next_recurrence}");
            $this->logToFile('  Current time: '.now());
            $this->logToFile("  Is {$original_next_recurrence} < ".now().'? '.($original_next_recurrence < now() ? 'YES' : 'NO'));

            $next_recurrence = now();
            switch ($item->type) {
                case InvoiceItemType::Daily:
                    $next_recurrence = $item->next_recurrence_at->copy()->addDays(1);
                    break;
                case InvoiceItemType::Weekly:
                    $next_recurrence = $item->next_recurrence_at->copy()->addWeeks(1);
                    break;
                case InvoiceItemType::Monthly:
                    $next_recurrence = $item->next_recurrence_at->copy()->addMonths(1);
                    break;
                case InvoiceItemType::Quarterly:
                    $next_recurrence = $item->next_recurrence_at->copy()->addMonths(3);
                    break;
                case InvoiceItemType::Yearly:
                    $next_recurrence = $item->next_recurrence_at->copy()->addYears(1);
                    break;
            }

            $this->logToFile("  Calculated new next_recurrence_at: {$next_recurrence}");

            $this->logToFile('  Creating new invoice item instance');

            $i = new InvoiceItem;
            $i->applyObject(json_decode(json_encode($item)));
            $i->text               = $i->text.'<br>Zeitraum: '.$item->next_recurrence_at->format('d.m.Y').' - '.$next_recurrence->copy()->subDays(1)->format('d.m.Y');
            $i->created_at         = now();
            $i->updated_at         = now();
            $i->next_recurrence_at = null;
            $i->type               = InvoiceItemType::Default;

            if ($i->qty == 0) {
                $i->qty       = 1;
                $i->unit_name = 'Stk';
            }

            if ($item->project) {
                $i->project_id = null;
                $i->company_id = $item->project->company_id;
                $i->text       = $item->project->name.'<br>'.$i->text;
                $i->position   = $item->project->indexedItems()->max('position') + 1;
            } elseif ($item->company) {
                $i->position = $item->company->indexedItems()->max('position') + 1;
            }

            unset($i->id);
            $i->save();

            $this->logToFile("  Created new invoice item with ID: {$i->id}");
            $this->logToFile("  Updating original item {$item->id} next_recurrence_at from {$item->next_recurrence_at} to {$next_recurrence}");

            $item->update(['next_recurrence_at' => $next_recurrence]);

            $this->logToFile("  Successfully updated item {$item->id}");
        }

        $this->logToFile('=== StandingOrders Cronjob Completed ===');
    }
}
