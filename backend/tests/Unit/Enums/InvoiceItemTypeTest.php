<?php

namespace Tests\Unit\Enums;

use App\Enums\InvoiceItemType;
use PHPUnit\Framework\TestCase;

class InvoiceItemTypeTest extends TestCase {
    public function test_repeating_group_contains_only_repeating_variants(): void {
        self::assertSame(
            [
                InvoiceItemType::Daily,
                InvoiceItemType::Weekly,
                InvoiceItemType::Monthly,
                InvoiceItemType::Quarterly,
                InvoiceItemType::Yearly,
            ],
            InvoiceItemType::Repeating
        );
    }
    public function test_total_remaining_group_contains_instalments(): void {
        self::assertContains(InvoiceItemType::Instalment, InvoiceItemType::TotalRemaining);
        self::assertContains(InvoiceItemType::Paydown, InvoiceItemType::TotalRemaining);
    }
}
