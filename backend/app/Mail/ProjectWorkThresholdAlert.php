<?php

namespace App\Mail;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectWorkThresholdAlert extends Mailable {
    use Queueable, SerializesModels;

    public function __construct(
        public Project $project,
        public int $threshold,
        public float $ratio
    ) {}

    public function envelope(): Envelope {
        return new Envelope(
            subject: "Work Budget Alert: {$this->project->name} exceeded {$this->threshold}%"
        );
    }
    public function content(): Content {
        return new Content(
            view: 'mail.project-work-threshold-alert',
            with: [
                'project'   => $this->project,
                'threshold' => $this->threshold,
                'percent'   => round($this->ratio * 100, 1),
            ],
        );
    }
}
