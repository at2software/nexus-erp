<?php

namespace App\Mail;

use App\Enums\VacationState;
use App\Models\Param;
use App\Models\Vacation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VacationMail extends Mailable {
    use Queueable, SerializesModels;

    private $_vacation;
    private $_state;
    private $_reason;
    private $_approver;

    public function __construct(Vacation $vacation, $state, $reason, $approver) {
        $this->_vacation = $vacation;
        $this->_state    = $state;
        $this->_reason   = $reason;
        $this->_approver = $approver;
    }
    public function replace($string): string {
        $string = str_replace('[vacationDuration]', $this->_vacation->started_at->format('d.m.Y').'-'.$this->_vacation->ended_at->format('d.m.Y'), $string);
        $string = str_replace('[userName]', $this->_vacation->user->name, $string);
        $string = str_replace('[vacationLog]', $this->_vacation->log, $string);
        $string = str_replace('[vacationDenyReason]', $this->_reason, $string);
        $string = str_replace('[approverName]', $this->_approver->name, $string);
        return $string;
    }
    public function envelope(): Envelope {
        return new Envelope(
            subject: $this->replace(Param::get('VACATION_MAIL_SUBJECT')->value),
        );
    }
    public function content(): Content {
        $key = ($this->_state == VacationState::Approved) ? 'VACATION_MAIL_APPROVED' : 'VACATION_MAIL_DENIED';
        return new Content(
            view: 'mail.vacation',
            with: ['content' => $this->replace(Param::get($key)->value)],
        );
    }
    public function attachments(): array {
        return [];
    }
}
