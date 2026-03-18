<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Models\Param;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoiceMail extends Mailable {
    use Queueable, SerializesModels;

    private $_invoice;
    private $_lang;
    private $_formality;

    public function __construct(Invoice $invoice) {
        $this->_invoice   = $invoice;
        $this->_lang      = $invoice->company->getLanguage();
        $this->_formality = $invoice->company->getFormality();
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope {
        $subject = Param::get('INVOICE_EMAIL_SUBJECT')->localizedValue($this->_lang, $this->_formality);
        return new Envelope(
            subject: str_replace('[invoiceName]', $this->_invoice->name, $subject),
        );
    }

    public function content(): Content {
        return new Content(
            view: 'mail.invoice',
            with: ['content' => Param::get('INVOICE_EMAIL_TEXT')->localizedValue($this->_lang, $this->_formality)],
        );
    }
    public function attachments(): array {
        return [Attachment::fromStorage($this->_invoice->file_dir)];
    }
}
