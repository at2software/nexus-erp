<?php

namespace App\Http\Middleware;

use App\Models\InvoiceItem;
use App\Models\ProjectState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HasPermissionsForInvoiceItemMiddleware extends CrudRoleMiddleware {
    public function handle(Request $request, Closure $next, string $permission, $guard = null): Response {
        if ($invoiceItem = $request->route('invoice_item')) {
            if (! is_a($invoiceItem, InvoiceItem::class)) {
                $invoiceItem = InvoiceItem::find($invoiceItem);
            }
            if ($invoiceItem?->project?->state->progress == ProjectState::Prepared) {
                return $next($request);
            }
        }
        return parent::handle($request, $next, $permission, $guard);
    }
}
