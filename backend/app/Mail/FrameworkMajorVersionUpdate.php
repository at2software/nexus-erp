<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FrameworkMajorVersionUpdate extends Mailable {
    use Queueable, SerializesModels;

    public function __construct(
        public string $frameworkName,
        public string $oldVersion,
        public string $newVersion
    ) {}

    public function envelope(): Envelope {
        return new Envelope(
            subject: "Framework Update: {$this->frameworkName} - Major Version Change"
        );
    }
    public function content(): Content {
        return new Content(
            view: 'mail.framework-update',
            with: [
                'frameworkName' => $this->frameworkName,
                'oldVersion'    => $this->oldVersion,
                'newVersion'    => $this->newVersion,
            ],
        );
    }
    public function attachments(): array {
        return [];
    }
}
