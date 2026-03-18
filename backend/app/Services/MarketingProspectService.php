<?php

namespace App\Services;

use App\Models\MarketingProspect;
use App\Models\MarketingProspectActivity;
use App\Models\Vcard;
use Illuminate\Http\Request;

class MarketingProspectService {
    public static function getProspects(Request $request) {
        $query = MarketingProspect::with(['marketingInitiative', 'leadSource', 'activities.marketingInitiativeActivity', 'company', 'companyContact.contact', 'companyContact.company', 'user']);

        if ($request->has('marketing_initiative_id')) {
            $query->where('marketing_initiative_id', $request->marketing_initiative_id);
        }

        if ($request->has('lead_source_id')) {
            $query->where('lead_source_id', $request->lead_source_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('added_via')) {
            $query->where('added_via', $request->added_via);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('linkedin_url')) {
            $linkedinUrl = $request->linkedin_url;
            if (preg_match('#linkedin\.com(/in/[^/?]+)#i', $linkedinUrl, $matches)) {
                $profilePath = $matches[1];
                $query->where('vcard', 'like', "%{$profilePath}%");
            } else {
                $query->where('vcard', 'like', "%{$linkedinUrl}%");
            }
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $prospects = $query->latest()->get();

        $prospects->each(function ($prospect) {
            $overdueCount                     = $prospect->activities()->where('status', 'pending')->where('scheduled_at', '<=', now())->count();
            $prospect->has_overdue_activities = $overdueCount > 0;
        });
        return $prospects;
    }
    public static function getProspectStats(): array {
        $total = MarketingProspect::count();

        $byStatus = [
            'new'           => MarketingProspect::where('status', 'new')->count(),
            'engaged'       => MarketingProspect::where('status', 'engaged')->count(),
            'converted'     => MarketingProspect::where('status', 'converted')->count(),
            'unresponsive'  => MarketingProspect::where('status', 'unresponsive')->count(),
            'disqualified'  => MarketingProspect::where('status', 'disqualified')->count(),
            'on_hold'       => MarketingProspect::where('status', 'on_hold')->count(),
        ];

        $activitiesPending = MarketingProspectActivity::where('status', 'pending')->count();
        $activitiesOverdue = MarketingProspectActivity::where('status', 'pending')
            ->where('scheduled_at', '<', now())->count();
        return [
            'total'               => $total,
            'by_status'           => $byStatus,
            'activities_pending'  => $activitiesPending,
            'activities_overdue'  => $activitiesOverdue,
        ];
    }
    public static function createProspectFromAddon(array $validated, $user): mixed {
        $vcard       = new Vcard($validated['vcard']);
        $linkedinUrl = $vcard->getFirstValue('URL');

        if ($linkedinUrl) {
            $existing = MarketingProspect::where('marketing_initiative_id', $validated['marketing_initiative_id'])
                ->get()
                ->first(fn ($p) => $p->linkedin_url === $linkedinUrl);

            if ($existing) {
                return ['error' => 'Prospect already exists', 'prospect' => $existing];
            }
        }

        if (! $vcard->getFirstValue('FN')) {
            $nAttr = $vcard->getFirstAttr('N');
            if ($nAttr) {
                $nParts     = explode(';', $nAttr);
                $familyName = $nParts[0] ?? '';
                $givenName  = $nParts[1] ?? '';
                $fullName   = trim($givenName.' '.$familyName);
                if ($fullName) {
                    $vcard->setProperty('FN', $fullName);
                    $validated['vcard'] = $vcard->toVCardString();
                }
            }
        }

        $validated['added_via'] = 'addon';
        $validated['user_id']   = $user->id;
        $prospect               = MarketingProspect::create($validated);
        return ['prospect' => $prospect->load(['activities.marketingInitiativeActivity', 'user'])];
    }
    public static function linkProspectToCompany(MarketingProspect $marketingProspect, int $companyId): MarketingProspect {
        $prospectVcard = new Vcard($marketingProspect->attributes['vcard'] ?? '');

        $fn    = $prospectVcard->getFirstValue('FN');
        $nAttr = $prospectVcard->getFirstAttr('N');
        $url   = $prospectVcard->getFirstValue('URL');

        $contactVcard = new Vcard;
        if ($fn) {
            $contactVcard->setProperty('FN', $fn);
        }
        if ($nAttr) {
            $contactVcard->setProperty('N', $nAttr);
        }
        if ($url) {
            $contactVcard->setProperty('URL', $url);
        }

        $contact = \App\Models\Contact::create([
            'vcard' => $contactVcard->toVCardString(),
        ]);

        $companyContactVcard = new Vcard($marketingProspect->attributes['vcard'] ?? '');

        $companyContact = \App\Models\CompanyContact::create([
            'contact_id' => $contact->id,
            'company_id' => $companyId,
            'vcard'      => $companyContactVcard->toVCardString(),
        ]);

        $marketingProspect->update([
            'company_contact_id' => $companyContact->id,
            'company_id'         => null,
        ]);
        return $marketingProspect->load(['company', 'companyContact.company']);
    }
    public static function convertProspect(MarketingProspect $marketingProspect, bool $createNew, ?int $companyId, ?string $companyName): mixed {
        if ($marketingProspect->company_contact_id) {
            return ['error' => 'Prospect already converted'];
        }

        $prospectVcard       = $marketingProspect->vcard;
        $prospectVcardString = $prospectVcard->toVCardString(false);

        $fn    = $prospectVcard->getFirstValue('FN');
        $nAttr = $prospectVcard->getFirstAttr('N');

        if (! $fn && ! $nAttr && empty($prospectVcardString)) {
            return ['error' => 'Prospect has no vcard data - cannot convert'];
        }

        if (! $nAttr && $fn) {
            $nameParts  = explode(' ', $fn);
            $familyName = array_pop($nameParts);
            $givenName  = implode(' ', $nameParts);
            $nAttr      = [$familyName, $givenName, '', '', ''];
        }

        \DB::beginTransaction();
        try {
            $contactVcard = new Vcard($prospectVcardString);
            $contactVcard->remove(['ORG', 'TITLE', 'ADR', 'TEL', 'EMAIL']);
            if ($fn) {
                $contactVcard->setProperty('FN', $fn);
            }
            if ($nAttr) {
                $contactVcard->setProperty('N', $nAttr);
            }

            $contact = \App\Models\Contact::create([
                'vcard' => $contactVcard->toVCardString(),
                'flags' => 0,
            ]);

            $companyContactVcard = new Vcard($prospectVcardString);
            $companyContactVcard->remove(['ORG', 'FN', 'N']);

            $targetCompanyId = null;
            if ($createNew && ! empty($companyName)) {
                $companyVcard = new Vcard;
                $companyVcard->setProperty('FN', $companyName);
                $companyVcard->setProperty('ORG', $companyName);

                $company = \App\Models\Company::create([
                    'vcard' => $companyVcard->toVCardString(),
                    'flags' => 0,
                ]);

                $targetCompanyId = $company->id;
            } elseif (! empty($companyId)) {
                $targetCompanyId = $companyId;
            }

            $companyContact = \App\Models\CompanyContact::create([
                'contact_id' => $contact->id,
                'company_id' => $targetCompanyId,
                'vcard'      => $companyContactVcard->toVCardString(),
                'flags'      => 0,
            ]);

            $marketingProspect->update([
                'company_contact_id' => $companyContact->id,
                'company_id'         => null,
            ]);

            \DB::commit();
            return ['prospect' => $marketingProspect->load(['companyContact.contact', 'companyContact.company'])];
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Prospect conversion failed:', ['error' => $e->getMessage()]);
            return ['error' => 'Conversion failed: '.$e->getMessage()];
        }
    }
}
