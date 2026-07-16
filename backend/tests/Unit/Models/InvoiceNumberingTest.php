<?php

namespace Tests\Unit\Models;

use App\Models\Invoice;
use Mockery;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

class InvoiceNumberingTest extends TestCase {
    protected function tearDown(): void {
        Mockery::close();
        parent::tearDown();
    }

    #[RunInSeparateProcess]
    public function test_get_current_invoice_number_uses_prefix_suffix_and_padding(): void {
        $paramAlias = Mockery::mock('alias:App\\Models\\Param');
        $paramAlias->shouldReceive('get')->with('INVOICE_NO_PREFIX')->andReturn((object)['value' => 'INV-']);
        $paramAlias->shouldReceive('get')->with('INVOICE_NO_SUFFIX')->andReturn((object)['value' => '/26']);
        $paramAlias->shouldReceive('get')->with('INVOICE_NO_DIGITS')->andReturn((object)['value' => 5]);
        $paramAlias->shouldReceive('get')->with('INVOICE_NO_CURRENT')->andReturn((object)['value' => '41']);

        self::assertSame(['value' => 'INV-00042/26'], Invoice::getCurrentInvoiceNumber(1));
    }
}
