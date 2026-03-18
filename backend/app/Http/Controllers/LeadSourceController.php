<?php

namespace App\Http\Controllers;

use App\Models\LeadSource;
use Illuminate\Http\Request;

class LeadSourceController extends Controller {
    public function store(Request $request) {
        return LeadSource::create((new LeadSource)->getValidFields($request->all()))->fresh();
    }
    public function destroy(LeadSource $lead_source) {
        return $lead_source->delete();
    }
}
