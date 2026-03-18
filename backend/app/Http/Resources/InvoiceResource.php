<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource {
    public function toArray($request) {
        return [
            'id'                      => $this->id,
            'name'                    => $this->name,
            'company_id'              => $this->company_id,
            'cancellation_invoice_id' => $this->cancellation_invoice_id,
            'file_dir'                => $this->file_dir,
            'default_interest'        => $this->default_interest,
            'sent'                    => $this->sent,
            'is_booked'               => $this->is_booked,
            'is_cancelled'            => $this->is_cancelled,
            'created_at'              => $this->created_at,
            'updated_at'              => $this->updated_at,
            'deleted_at'              => $this->deleted_at,
            'paid_at'                 => $this->paid_at,
            'due_at'                  => $this->due_at,
            'remind_at'               => $this->remind_at,
            'net'                     => $this->net,
            'gross'                   => $this->gross,
            'gross_remaining'         => $this->gross_remaining,
            'payment_duration'        => $this->payment_duration,
            'reminder_count'          => $this->reminder_count,
            'class'                   => $this->class,
            'icon'                    => $this->icon,
            'path'                    => $this->path,
        ];
    }
}
