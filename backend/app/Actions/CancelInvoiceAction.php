<?php

namespace App\Actions;

use App\Models\Invoice;
use App\Models\Param;
use horstoeko\zugferd\codelists\ZugferdInvoiceType;

class CancelInvoiceAction {
    public function __construct(
        private CreateInvoiceAction $createInvoiceAction,
        private UpdateInvoiceStatisticsAction $updateStatisticsAction
    ) {}

    public function execute(Invoice $invoice): array {
        $title = Param::get('INVOICE_CANCEL_TITLE')->value;

        $items = $invoice->invoiceItems;
        $items->each(function (&$_) {
            $_->qty   = -$_->qty;
            $_->net   = -$_->net;
            $_->total = -$_->total;
            $_->gross = -$_->gross;
        });

        [$cancellationInvoice, $zugferdPdf, $filename] = $this->createInvoiceAction->execute(
            $items,
            $title,
            Param::get('INVOICE_CANCEL_PREFIX')->value,
            Param::get('INVOICE_CANCEL_SUFFIX')->value,
            $invoice->company,
            ZugferdInvoiceType::CORRECTION,
            $invoice
        );

        Invoice::batchAssign($invoice->invoiceItems()->get(), null, $invoice->company->id);
        $invoice->setCancelledAttributes();
        $cancellationInvoice->cancellation_invoice_id = $invoice->id;
        $cancellationInvoice->setCancelledAttributes();

        $this->updateStatisticsAction->execute($invoice->company);
        $this->updateStatisticsAction->execute();
        return [$zugferdPdf, $filename];
    }
}
