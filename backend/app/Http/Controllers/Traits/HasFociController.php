<?php

namespace App\Http\Controllers\Traits;

use App\Models\Company;
use App\Models\InvoiceItem;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

trait HasFociController {
    public function _indexFoci(Request $request, Project|Company $model) {
        $query = $model->foci()->with('invoiceItem', 'invoicedInItem:id,text');

        if ($request->has('users')) {
            $userIds = explode(',', $request->get('users'));
            $userIds = array_filter($userIds, 'is_numeric'); // Filter valid numeric IDs
            if (! empty($userIds)) {
                $query->whereIn('user_id', $userIds);
            }
        }

        if ($request->has('not_yet_invoiced') && $request->boolean('not_yet_invoiced')) {
            $query->whereNull('invoiced_in_item_id');
        }

        if ($request->has('start_date')) {
            $start = Carbon::createFromFormat('Y-m-d', $request->get('start_date'))->startOfDay();
            $query->where('started_at', '>=', $start);
        }
        if ($request->has('end_date')) {
            $end = Carbon::createFromFormat('Y-m-d', $request->get('end_date'))->endOfDay();
            $query->where('started_at', '<=', $end);
        }

        if ($request->has('sort') && $request->has('direction')) {
            $sortField = $request->get('sort');
            $direction = $request->get('direction', 'asc');

            $allowedFields = ['started_at', 'duration', 'comment', 'user_id'];
            if (in_array($sortField, $allowedFields)) {
                $query->orderBy($sortField, $direction);
            }
        } else {
            $query->latest('started_at');
        }

        $pages = $query->paginate(50);

        $pages->getCollection()->transform(function ($_) {
            if ($_->invoiceItem) {
                $_->invoiceItem = $_->invoiceItem?->setVisible(InvoiceItem::INFO_REDUCED);
            }
            return $_;
        });
        return $pages->withQueryString();
    }
}
