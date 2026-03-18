<?php

namespace App\Http\Controllers;

use App\Http\Middleware\Auth;
use App\Models\InvoiceItem;
use App\Models\InvoiceItemPrediction;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceItemPredictionController extends Controller {
    public function predict(Request $request, InvoiceItem $_) {
        return InvoiceItemPrediction::findOrCreate(Auth::user()->id, $_->id)->applyAndSave($request);
    }
    public function deletePrediction(Request $request, InvoiceItem $_) {
        if ($i = InvoiceItemPrediction::find(Auth::user()->id, $_->id)) {
            $i->delete();
        }
        return $_->fresh();
    }
    public function stats(Request $request, Project $_) {
        $total = $_->invoiceItems()->where('type', '<', 10)->get()->count();
        if ($total > 0) {
            return [
                'total'       => $total,
                'predictions' => $_->predictions()->select(DB::raw('count(*) as total'), 'user_id')->where('type', '<', 10)->groupBy('user_id')->with('user')->get(),
            ];
        } else {
            return [];
        }
    }
}
