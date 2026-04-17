<?php

namespace App\Http\Controllers;

use App\Enums\InvoiceItemType;
use App\Helpers\NLog;
use App\Http\Controllers\Traits\HasFociController;
use App\Models\Company;
use App\Models\Connection;
use App\Models\Invoice;
use App\Models\Param;
use App\Services\FocusStatisticsService;
use App\Traits\ControllerHasPermissionsTrait;
use App\Traits\HasParams;
use Illuminate\Console\Command;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;

class CompanyController extends Controller {
    use ControllerHasPermissionsTrait, HasFociController;

    /**
     * Get companies with valid coordinates for map display.
     */
    public function indexWithCoordinates(Request $request) {
        $myCompany = Param::get('ME_ID')->value;

        $companies = Company::select('id', 'vcard', 'net')
            ->whereNot('id', $myCompany)
            ->where('vcard', 'REGEXP', '(^|\n)GEO:')
            ->get()
            ->map(function ($company) {
                // Extract GEO coordinates from vcard using VcardTrait method
                $geoData = $company->vcard->getFirstAttr('GEO');
                if ($geoData && count($geoData) >= 2 && ! empty($geoData[0]) && ! empty($geoData[1])) {
                    $lat = floatval($geoData[0]);
                    $lng = floatval($geoData[1]);

                    // Only include if coordinates are valid numbers and not zero
                    if (is_numeric($geoData[0]) && is_numeric($geoData[1]) && $lat != 0 && $lng != 0) {
                        // Calculate pin properties based on net value
                        $net      = floatval($company->net ?? 0);
                        $pinSize  = 'small';
                        $pinColor = 'grey';

                        if ($net < 1000) {
                            $pinSize  = 'small';
                            $pinColor = 'grey';
                        } elseif ($net < 10000) {
                            $pinSize  = 'small';
                            $pinColor = 'red';
                        } elseif ($net < 100000) {
                            $pinSize  = 'medium';
                            $pinColor = 'orange';
                        } elseif ($net < 1000000) {
                            $pinSize  = 'large';
                            $pinColor = 'yellow';
                        } else {
                            $pinSize  = 'large';
                            $pinColor = 'green';
                        }
                        return [
                            'id'       => $company->id,
                            'name'     => $company->name, // This uses the getNameAttribute() from VcardTrait
                            'lat'      => $lat,
                            'lng'      => $lng,
                            'path'     => $company->path,
                            'pinSize'  => $pinSize,
                            'pinColor' => $pinColor,
                        ];
                    }
                }
                return null;
            })
            ->filter();
        return response()->json($companies->values());
    }

    public function indexFoci(Request $request, Company $_) {
        return $this->_indexFoci($request, $_);
    }

    /**
     * Display a listing of the companies.
     */
    public function index(Request $request) {
        $myCompany = Param::get('ME_ID')->value;
        $query     = Company::select()->whereNot('id', $myCompany);
        $user      = Auth::user();

        // Project-based filters
        if ($request->onlyWithActiveProjects == 'true') {
            $query->withCount(['projects' => fn ($q) => $q->wherePreparedOrRunning()])->having('projects_count', '>', 0);
        }

        // Revenue filters
        if ($request->revenueOn == 'true') {
            $query->having('revenue', '>', $request->revenueMin);
        }

        // Date range filter (created_at)
        if ($request->has('created_from')) {
            $query->where('created_at', '>=', $request->created_from);
        }
        if ($request->has('created_to')) {
            $query->where('created_at', '<=', $request->created_to);
        }

        // Updated date filter (updated_at)
        if ($request->has('updated_from')) {
            $query->where('updated_at', '>=', $request->updated_from);
        }
        if ($request->has('updated_to')) {
            $query->where('updated_at', '<=', $request->updated_to);
        }

        // Revenue larger than X filter
        if ($request->has('revenue_min') && is_numeric($request->revenue_min)) {
            $query->where('net', '>=', floatval($request->revenue_min));
        }

        // Customer of specific product filter
        if ($request->has('product_id') && is_numeric($request->product_id)) {
            $query->whereHas('invoices', function ($invoiceQuery) use ($request) {
                $invoiceQuery->whereHas('invoiceItems', function ($itemQuery) use ($request) {
                    $itemQuery->where('product_source_id', $request->product_id);
                });
            });
        }

        // Sorting
        $sortBy        = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');

        // Validate sort column to prevent SQL injection
        $allowedSortColumns = ['created_at', 'updated_at', 'customer_number', 'net'];
        if (in_array($sortBy, $allowedSortColumns)) {
            $query->orderBy($sortBy, $sortDirection === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest(); // Default fallback
        }

        // Eager load counts and sums at database level to avoid N+1
        $query->withCount(['projectsUnfinished as running_project_count']);

        if ($user->hasAnyRole(['admin', 'financial'])) {
            $query->withCount(['invoicesUnpaid as unpaid_invoice_count'])
                ->withSum('invoicesUnpaid as unpaid_invoice_value', 'gross');
        }

        $query->with(['projectsUnfinished' => function ($q) {
            $q->withSum('foci as hours_invested', 'duration');
        }]);

        $replies = $query->paginate(100);
        $replies->withQueryString();
        $replies->appends($request->input())->links();

        $companyHidden = ['customer_number', 'vat_id', 'managing_director', 'commercial_register', 'invoice_correction', 'invoice_email', 'address', 'discount', 'has_direct_debit', 'requires_po', 'has_nda', 'remarketing_interval', 'flags', 'total_time', 'net_remaining', 'contact_id'];
        $projectHidden = ['company', 'params', 'hours_invested', 'intro', 'outro', 'description', 'work_estimated', 'target_wage', 'support_net', 'net_remaining', 'gross', 'lead_probability', 'is_ignored_from_prepared', 'decision_at', 'vcard'];

        $replies->each(function (&$r) use ($companyHidden, $projectHidden) {
            $r->append('running_project_value');
            $r->makeHidden($companyHidden);
            $r->projectsUnfinished->each(fn ($p) => $p->makeHidden($projectHidden));
        });
        return $replies;
    }

    /**
     * Show a company by phone number.
     */
    public function showByPhone(Request $request): ?JsonResponse {
        $phoneNumber = $request->input('phone_number');
        $company     = Company::searchByPhone($phoneNumber);
        if (empty($company)) {
            return null;
        }
        $user = Auth::user();
        $company->employees;
        $company->invoices;
        $company->employees->each(fn ($_) => $_->contact);
        $company->assignees;
        $company->assignees->each(fn ($_) => $_->assignee);
        $company->append('address');
        if ($user->hasAnyRole(['admin', 'financial'])) {
            $company->append('params');
        }
        return response()->json($company);
    }

    public function indexUnbilledFoci() {
        $widgetController = new WidgetController;
        return $widgetController->GET_CASHFLOW_CUSTOMER_SUPPORT()->getAndAppend();
    }

    /**
     * Display a listing of the assignees for a company.
     */
    public function indexAssignees(Company $_) {
        return $_->assignees()->latest('role_id')->load('parent');
    }

    /**
     * Display a listing of the comments for a company.
     */
    public function indexComments(Company $_) {
        return $_->comments;
    }

    /**
     * Display a listing of the connections for a company.
     */
    public function indexConnections(Company $_) {
        $connections1 = Connection::where('company1_id', $_->id)
            ->with(['company1', 'company2'])
            ->withCount('projects')
            ->get();

        $connections2 = Connection::where('company2_id', $_->id)
            ->with(['company1', 'company2'])
            ->withCount('projects')
            ->get();
        return Connection::obfuscateNet($connections1->merge($connections2));
    }

    /**
     * Display a listing of all connections.
     */
    public function indexAllConnections() {
        return Connection::obfuscateNet(
            Connection::with(['company1', 'company2'])->withCount('projects')->get()
        );
    }

    /**
     * Display a listing of the employees for a company.
     */
    public function indexEmployees(Company $_) {
        return $_->employees;
    }

    public function indexInvoiceItems(Request $request, Company $_) {
        $query = $_->indexedItems()->whereNull('invoice_id');

        if ($request->boolean('support_only')) {
            $query->whereNull('project_id');
        }
        return $query->get();
    }
    public function showPredictionAccuracy(Company $_) {
        return response()->json(FocusStatisticsService::getCompanyMonthlyPredictionAccuracy($_));
    }

    /**
     * Display the specified company.
     */
    public function show(Company $company) {
        $company->appendRequest();
        $company->withRequest();
        $company->load([
            'assignees',
            'assignees.assignee',
            'baseProjects',
            'employees',
            'employees.contact',
            'employees.contact.companies',
            'invoices',
            'source',
            'files',
            ...HasParams::$WITH,
        ]);

        // Load available connections for adding participants to projects
        $connections = Connection::where('company1_id', $company->id)
            ->orWhere('company2_id', $company->id)
            ->with(['company1', 'company2'])
            ->get();

        $availableConnections = $connections->map(function ($connection) use ($company) {
            return [
                'connection_id' => $connection->id,
                'other_company' => $connection->getOtherCompany($company->id),
            ];
        });

        $company->setAttribute('available_connections', $availableConnections);
        $company->baseProjects->each(fn ($_) => $_->append('hours_invested', 'work_estimated'));
        $company->append('address', 'desicion_duration');
        if (Auth::user()->hasAnyRole(['admin', 'financial'])) {
            $company->append('params', 'billing_considerations');
            $company->upcomingRepeatingInvoiceItems;
        }
        return $company->toJson();
    }

    /**
     * Store a newly created company.
     */
    public function store(Request $request) {
        $data = $this->getBody();
        if (preg_match("/^https?:\/\//is", $data->name)) {
            $vcard = Company::scrapeWebpage($data->name);
        } else {
            $vcard = 'FN:'.$data->name.PHP_EOL;
            $vcard .= 'ORG:'.$data->name.PHP_EOL;
            $vcard .= 'ADR;type=work:;;;;;;DE'.PHP_EOL;
            $vcard .= 'URL;type=work:https://'.PHP_EOL;
        }
        $new        = new Company;
        $new->vcard = $vcard;
        $new->save();
        while (Artisan::call('customers:fixMissingNumbers') != Command::SUCCESS) {
        } // Add missing customer numbers
        return $new;
    }

    /**
     * Store a newly created assignee for a company.
     */
    public function storeAssignee(Company $_) {
        return $_->addAssigneeFromRequest();
    }

    /**
     * Store a newly created employee for a company.
     */
    public function storeEmployee(Company $_) {
        return $_->createEmployee();
    }

    /**
     * Store a new connection between two companies.
     */
    public function storeConnection() {
        request()->validate([
            'company1_id' => 'required|exists:App\Models\Company,id',
            'company2_id' => 'required|exists:App\Models\Company,id',
        ]);
        $q  = ['company1_id' => request('company1_id'), 'company2_id' => request('company2_id')];
        $q2 = ['company1_id' => request('company2_id'), 'company2_id' => request('company1_id')];
        if (Connection::where($q)->exists()) {
            return response('connection already exists', 405);
        }
        if (Connection::where($q2)->exists()) {
            return response('connection already exists', 405);
        }
        if (request('company1_id') == request('company2_id')) {
            return response('cannot connect to itself', 405);
        }
        $con = Connection::create($q);
        $con->company1;
        $con->company2;
        return $con;
    }

    /**
     * Import imprint data from the company's website.
     */
    public function importImprint(Request $request, Company $_) {
        NLog::info('ImportImprint: Starting imprint import for company', ['company_id' => $_->id, 'company_name' => $_->name]);

        if ($url = $_->vcard->getFirstValue('URL')) {
            NLog::info('ImportImprint: Found URL in company vcard', ['url' => $url]);

            try {
                // Get the scraped data including business register information
                \Artisan::call('app:analyzeUrlImprint', [
                    'url'              => $url,
                    '--existing-vcard' => $_->vcard,
                ]);
                $scrapedData = json_decode(\Artisan::output());

                // Update vcard with scraped webpage data
                $_->vcard = Company::scrapeWebpage($url, $_);

                // Update commercial register if found and not already set
                if (! empty($scrapedData->BUSINESS_REGISTER)) {
                    if (empty($_->commercial_register)) {
                        $_->commercial_register = $scrapedData->BUSINESS_REGISTER;
                        NLog::info('ImportImprint: Set commercial register', ['register' => $scrapedData->BUSINESS_REGISTER]);
                    } else {
                        NLog::info('ImportImprint: Commercial register already exists, keeping existing value', [
                            'existing' => $_->commercial_register,
                            'scraped'  => $scrapedData->BUSINESS_REGISTER,
                        ]);
                    }
                }

                $_->save();
                NLog::info('ImportImprint: Successfully scraped and saved imprint data');
            } catch (\Exception $e) {
                NLog::error('ImportImprint: Error scraping webpage', ['error' => $e->getMessage(), 'url' => $url]);
                throw $e;
            }
        } else {
            NLog::warning('ImportImprint: No URL found in company vcard', ['company_id' => $_->id]);
        }
        return $_;
    }

    /**
     * Update the specified company.
     */
    public function update(Request $request, int $id) {
        return Company::findOrFail($id)->applyAndSave($request);
    }

    /**
     * Remove the specified company.
     */
    public function destroy(Request $request, Company $company) {
        $company->delete();
        return response()->make('success', 202);
    }

    /**
     * Create an invoice for the specified company.
     */
    public function makeInvoice(Company $_) {
        return $_->makeInvoiceFor();
    }

    /**
     * Activate all inactive repeating invoice items for a company.
     */
    public function updateActivateRepeatingItems(Company $_) {
        $updated = $_->invoiceItems()
            ->whereIn('type', InvoiceItemType::Repeating)
            ->whereNull('next_recurrence_at')
            ->update(['next_recurrence_at' => now()]);

        // trigger spawns
        Artisan::call('cron:standing-orders');
        return response()->json(['activated_count' => $updated]);
    }

    /**
     * Display a listing of the companies with missing commercial register information.
     */
    public function maintenanceCommercialRegister() {
        return Company::whereActive()->whereCorporation()->whereMissingCommercialRegister()->get();
    }
}
