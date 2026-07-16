<?php

namespace App\Mail;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectPredictedOverrunAlert extends Mailable {
    use Queueable, SerializesModels;

    public function __construct(
        public Project $project,
        public int $threshold,
        public float $predictedFinal
    ) {}

    public function envelope(): Envelope {
        return new Envelope(
            subject: "Predicted Overrun: {$this->project->name} likely to exceed {$this->threshold}%"
        );
    }
    public function content(): Content {
        $ratio = $this->project->work_estimated > 0 ? $this->predictedFinal / $this->project->work_estimated : 0;
        return new Content(
            view: 'mail.project-predicted-overrun-alert',
            with: [
                'project'        => $this->project,
                'threshold'      => $this->threshold,
                'predictedFinal' => round($this->predictedFinal, 1),
                'percent'        => round($ratio * 100, 1),
            ],
        );
    }
}
