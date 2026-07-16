<?php

namespace App\Services\FinTs;

class FinTsTransaction {
    const CD_CREDIT = 'C';
    const CD_DEBIT  = 'D';

    public function __construct(
        private string $creditDebit,
        private float $amount,
        private string $name,
        private string $mainDescription,
        private ?\DateTime $bookingDate,
        private bool $storno = false,
    ) {}

    public function getCreditDebit(): string {
        return $this->creditDebit;
    }
    public function getAmount(): float {
        return $this->amount;
    }
    public function getName(): string {
        return $this->name;
    }
    public function getMainDescription(): string {
        return $this->mainDescription;
    }
    public function getBookingDate(): ?\DateTime {
        return $this->bookingDate;
    }
    public function isStorno(): bool {
        return $this->storno;
    }
}
