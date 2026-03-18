<?php

namespace App\Http\Controllers;

use App\Models\CompanyContact;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;

class CompanyContactController extends Controller {
    use ControllerHasPermissionsTrait;

    public function update(Request $request, CompanyContact $company_contact): CompanyContact {
        $company_contact->applyAndSave($request);
        $company_contact->projects;
        $company_contact->contact->companies;
        return $company_contact;
    }
    public function destroy(Request $request, CompanyContact $companyContact) {
        return $companyContact->delete();
    }
    public function show(CompanyContact $company_contact): CompanyContact {
        $company_contact->projects;
        $company_contact->contact->companies;
        return $company_contact;
    }
    public function store(Request $request) {
        $new = new CompanyContact;
        $new->applyAndSaveRequest();
        $new->fresh();
        $new->company->name;
        return $new;
    }
}
