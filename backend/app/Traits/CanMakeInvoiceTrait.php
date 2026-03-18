<?php

namespace App\Traits;

use App\Actions\CreateInvoiceAction;
use App\Actions\UpdateInvoiceStatisticsAction;
use App\Enums\InvoiceItemType;
use App\Models\File;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use horstoeko\zugferd\codelists\ZugferdInvoiceType;
use Illuminate\Support\Facades\Artisan;

trait CanMakeInvoiceTrait {
    public function makeInvoiceFor($nonPersistantItems = null) {
        Invoice::disablePropagation();

        $this->invoiceItems()->whereType(InvoiceItemType::PreparedRecurring)->update(['type' => InvoiceItemType::Default]);

        [$company, $project, $items] = $this->extractContextAndItemsForInvoice($nonPersistantItems);

        if ($error = $this->validateCompanyVatForInvoice($company)) {
            return $error;
        }

        $prefix = $company->param('INVOICE_PREFIX', true)->localizedValue($company->getLanguage(), $company->getFormality()) ?? '';
        $suffix = $company->param('INVOICE_SUFFIX', true)->localizedValue($company->getLanguage(), $company->getFormality()) ?? '';

        [$invoice, $zugferdPdf, $filename] = app(CreateInvoiceAction::class)->execute(
            $items,
            'Rechnung',
            $prefix,
            $suffix,
            $company,
            ZugferdInvoiceType::INVOICE,
            null,
            $project
        );

        Invoice::batchAssign($items, $invoice->id, null);
        $company->invoice_correction = '';
        $company->save();

        app(UpdateInvoiceStatisticsAction::class)->execute($company);
        app(UpdateInvoiceStatisticsAction::class)->execute();

        $this->activateRepeatingItemsForInvoice($company);

        Invoice::enablePropagation();
        $company->propagateDirty();
        return response($zugferdPdf)->withHeaders(File::headers($filename, 'application/pdf'));
    }
    private function extractContextAndItemsForInvoice($nonPersistantItems): array {
        if ($this instanceof \App\Models\Project) {
            $project = $this;
            $company = $project->company;
            $items   = $this->collectItemsForProjectInvoice($nonPersistantItems);
            return [$company, $project, $items];
        }
        return [$this, null, $this->preparedInvoiceItems()->get()];
    }
    private function collectItemsForProjectInvoice($nonPersistantItems = null) {
        if ($nonPersistantItems) {
            return $this->createNonPersistantProjectItemsForInvoice($nonPersistantItems);
        }

        if (intval(request('type', null)) == 2) {
            $itemIds = $this->invoiceItems()->whereType(InvoiceItemType::PreparedSupport)->pluck('id');
            $this->invoiceItems()->whereIn('id', $itemIds)->update(['type' => InvoiceItemType::Default]);
            return $this->invoiceItems()->whereIn('id', $itemIds)->get();
        }
        return $this->preparedInvoiceItems()->get();
    }
    private function createNonPersistantProjectItemsForInvoice(array $nonPersistantItems) {
        $maxPosition = ($this->invoiceItems()->max('position') ?? 0) + 1;
        return collect($nonPersistantItems)->map(function ($itemData, $index) use ($maxPosition) {
            $data             = array_intersect_key($itemData, array_flip(['price', 'qty', 'text', 'unit_name', 'vat_rate']));
            $data['type']     = InvoiceItemType::Default;
            $data['position'] = $index;
            $invoiceItem      = InvoiceItem::create($data);

            $paydownData               = $data;
            $paydownData['qty']        = -$data['qty'];
            $paydownData['project_id'] = $this->id;
            $paydownData['type']       = InvoiceItemType::Paydown;
            $paydownData['position']   = $index + $maxPosition;
            InvoiceItem::create($paydownData);
            return $invoiceItem->fresh();
        });
    }
    private function validateCompanyVatForInvoice($company) {
        if (! $company->vat_id) {
            return null;
        }

        Artisan::call('vat_id:check', ['company' => $company]);
        $output = json_decode(Artisan::output());
        return $output->is_valid ? null : response($output->error_description, 400);
    }
    private function activateRepeatingItemsForInvoice($company): void {
        $company->repeatingItems->each(fn ($item) => $item->next_recurrence_at ?: $item->update(['next_recurrence_at' => now()]));
    }
}
