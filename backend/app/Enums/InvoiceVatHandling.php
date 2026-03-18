<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class InvoiceVatHandling extends Enum {
    const Net   = 0;
    const Gross = 1;
}
