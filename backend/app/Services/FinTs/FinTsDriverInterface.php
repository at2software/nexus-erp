<?php

namespace App\Services\FinTs;

interface FinTsDriverInterface {
    /** @return FinTsTransaction[] */
    public function fetchTransactionsSince(\DateTime $since): array;
    public function fetchBalance(): ?float;
}
