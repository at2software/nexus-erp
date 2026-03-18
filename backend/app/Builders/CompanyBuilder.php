<?php

namespace App\Builders;

use App\Models\CompanyContact;
use App\Models\Contact;
use App\Traits\HasParamsBuilder;
use App\Traits\HasVcardBuilder;
use Illuminate\Support\Facades\Auth;

class CompanyBuilder extends BaseBuilder {
    use HasParamsBuilder;
    use HasVcardBuilder;

    public function withRevenue($within = null) {
        if (Auth::user()->hasAnyRole(['admin', 'financial'])) {
            return $this;
        }
        return $this->withSum(['invoices' => function ($i) use ($within) {
            if ($within) {
                $i->whereBetweenString($within, 'invoices.created_at');
            }
        }], 'net');
    }
    public function whereActive() {
        return $this->where('is_deprecated', false);
    }
    public function whereCorporation() {
        return $this->whereRaw('vcard REGEXP ?', ['(?i)(^|\n)ORG.*:.* (GmbH|AG|KG)(\s+.*)?($|\n)']);
    }
    public function whereMissingCommercialRegister() {
        return $this->whereNull('commercial_register');
    }
    public function whereCustomerNumberIsMissing() {
        return $this->where('customer_number', '')->orWhere('customer_number', null);
    }
    public function whereHasUnbilledFoci() {
        return $this->whereHas('foci_unbilled')->withSum('foci_unbilled', 'duration');
    }
    public function whereHasSupportItems() {
        return $this->whereHas('supportItems');
    }
    public function searchByPhone($phoneNumber) {
        $searchVariants = $this->normalizePhoneSearchString($phoneNumber);

        foreach ($searchVariants as $variant) {
            $regex   = $this->buildPhoneRegex($variant);
            $company = self::where('vcard', 'REGEXP', $regex)->first();
            if ($company) {
                return $company;
            }
        }
        foreach ($searchVariants as $variant) {
            $regex          = $this->buildPhoneRegex($variant);
            $companyContact = CompanyContact::where('vcard', 'REGEXP', $regex)->first();
            if ($companyContact) {
                return $companyContact->company;
            }
        }
        foreach ($searchVariants as $variant) {
            $regex   = $this->buildPhoneRegex($variant);
            $contact = Contact::where('vcard', 'REGEXP', $regex)->first();
            if ($contact && $contact->companies->isNotEmpty()) {
                return $contact->companies->first();
            }
        }
        return null;
    }
    public function normalizePhoneSearchString($search) {
        $search = preg_replace('/\(0\)/', '', $search);
        $search = preg_replace('/[\(\)]/', '', $search);
        $search = preg_replace('/[\s\-]/', '', $search);

        if (strpos($search, '0') === 0) {
            $normalizedVariants = [
                '0'.substr($search, 1),
                '+49'.substr($search, 1),
            ];
        } elseif (strpos($search, '+49') === 0) {
            if (strpos($search, '0') === 3) {
                $normalizedVariants = [
                    '+49'.substr($search, 4),
                    '0'.substr($search, 4),
                ];
            } else {
                $normalizedVariants = [
                    '+49'.substr($search, 3),
                    '0'.substr($search, 3),
                ];
            }
        } else {
            $normalizedVariants = [$search];
        }
        return $normalizedVariants;
    }
    public function buildPhoneRegex($normalizedNumber) {
        $chars   = str_split($normalizedNumber);
        $pattern = '';
        foreach ($chars as $char) {
            $escaped = preg_quote($char, '/');
            $pattern .= $escaped.'[\s\-\(\)]*';
        }
        return $pattern;
    }
}
