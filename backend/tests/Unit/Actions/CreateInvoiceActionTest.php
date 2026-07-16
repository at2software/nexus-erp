<?php

namespace Tests\Unit\Actions;

use App\Actions\CreateInvoiceAction;
use App\Services\InvoiceItemEnhancementService;
use App\Services\InvoicePdfService;
use Mockery;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class CreateInvoiceActionTest extends TestCase {
    protected function tearDown(): void {
        Mockery::close();
        parent::tearDown();
    }

    #[RunInSeparateProcess]
    public function test_increment_invoice_number_increases_current_value_and_saves_param(): void {
        $invoiceNoParam        = Mockery::mock();
        $invoiceNoParam->value = 41;
        $invoiceNoParam->shouldReceive('save')->once();

        $paramAlias = Mockery::mock('alias:App\\Models\\Param');
        $paramAlias->shouldReceive('get')
            ->once()
            ->with('INVOICE_NO_CURRENT')
            ->andReturn($invoiceNoParam);

        $action = new CreateInvoiceAction(
            Mockery::mock(InvoicePdfService::class),
            Mockery::mock(InvoiceItemEnhancementService::class)
        );

        $method = (new ReflectionClass($action))->getMethod('incrementInvoiceNumber');
        $method->setAccessible(true);
        $method->invoke($action);

        self::assertSame(42, $invoiceNoParam->value);
    }
}
