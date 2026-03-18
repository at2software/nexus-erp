<?php

namespace App\Http\Controllers;

use App\Enums\VacationState;
use App\Mail\VacationMail;
use App\Models\User;
use App\Models\Vacation;
use App\Models\VacationGrant;
use App\Traits\ControllerHasPermissionsTrait;
use Closure;
use Mail;
use Storage;

class VacationController extends Controller {
    use ControllerHasPermissionsTrait;

    public function indexGrants(User $_) {
        return $_->vacation_grants()
            ->whereAfter(now(), 'expires_at')
            ->with('vacations', fn ($q) => $q->whereNot('state', VacationState::Sick))
            ->latest()->get();
    }
    public function indexRequests(User $_) {
        $collection = $_->vacations()->with('grant')->where('state', VacationState::Open)->get();
        return $collection;
    }
    public function indexAbsences(User $_) {
        return $_->vacations()
            ->whereIn('state', [VacationState::Approved, VacationState::Sick])
            ->select('vacations.id', 'vacations.state', 'vacations.started_at', 'vacations.ended_at', 'vacations.comment')
            ->orderBy('vacations.started_at')
            ->get();
    }
    public function indexSickNotes() {
        // Back to simple approach - avoid complex joins and mapping
        return Vacation::where('state', VacationState::Sick)
            ->whereNull('approved_at')
            ->with('user')
            ->get();
    }
    public function indexPendingRequests() {
        return Vacation::where('state', VacationState::Open)->with('user', 'grant')->get();
    }
    private function _indexHolidays($year) {
        $filePath = "holidays/$year.json";
        $data     = Storage::get($filePath);
        if (! $data) {
            $data = file_get_contents("https://feiertage-api.de/api/?jahr=$year");
            Storage::put($filePath, $data);
        }
        // TODO: Hardcoded "BY" should be removed!
        $data     = json_decode($data);
        $response = [];
        foreach ($data->BY as $name => $_) {
            $_->name    = $name;
            $response[] = $_;
        }
        return $response;
    }
    public function indexHolidays($workZip = null) {
        $year     = intval(date('Y'));
        $holidays = [...$this->_indexHolidays($year - 1), ...$this->_indexHolidays($year), ...$this->_indexHolidays($year + 1)];

        // Filter holidays based on work ZIP code if provided
        if ($workZip) {
            $holidays = array_filter($holidays, function ($holiday) use ($workZip) {
                return $this->isHolidayValidForZip($holiday, $workZip);
            });
        }
        return array_values($holidays);
    }
    private function isHolidayValidForZip($holiday, $workZip) {
        $holidayName = $holiday->name;
        $hint        = $holiday->hinweis ?? '';

        // Augsburger Friedensfest - only valid in Augsburg (ZIP codes 86...)
        if (strpos($holidayName, 'Augsburger Friedensfest') !== false) {
            return substr($workZip, 0, 2) === '86';
        }

        // Mariä Himmelfahrt - complex rules based on Catholic majority
        if (strpos($holidayName, 'Mariä Himmelfahrt') !== false) {
            return $this->isCatholicMajorityZip($workZip);
        }

        // Fronleichnam - specific regions in some states
        if (strpos($holidayName, 'Fronleichnam') !== false && ! empty($hint)) {
            return $this->isFronleichnamValidForZip($workZip, $hint);
        }

        // All other holidays are valid everywhere
        return true;
    }
    private function isCatholicMajorityZip($workZip) {
        // This is a simplified version - you'd need the actual list from Bayerisches Landesamt für Statistik
        // Based on the official 2011 census data, these are known Catholic majority areas
        $catholicZipRanges = [
            // Munich city and immediate Catholic suburbs
            ['80331', '80339'], // Munich center
            ['80469', '80469'], // München-Au
            ['81241', '81249'], // München-Pasing Catholic areas

            // Lower Bavaria - traditionally Catholic
            ['84028', '84028'], // Landshut
            ['94032', '94036'], // Passau area
            ['84347', '84359'], // Pfarrkirchen area

            // Upper Bavaria - Alpine Catholic regions
            ['83022', '83026'], // Rosenheim Catholic areas
            ['82467', '82467'], // Garmisch-Partenkirchen
            ['83471', '83471'], // Berchtesgaden

            // Swabia - selective Catholic municipalities
            ['87435', '87439'], // Kempten Catholic areas (your default!)
            ['89073', '89077'], // Ulm surrounding Catholic villages

            // Note: This is a VERY simplified list. The real implementation needs
            // the official 1704 municipalities list from Bayerisches Landesamt
        ];

        foreach ($catholicZipRanges as $range) {
            if ($workZip >= $range[0] && $workZip <= $range[1]) {
                return true;
            }
        }

        // TODO: Load from official data source or mapping file
        // The real list contains 1704 specific municipalities
        return false;
    }
    private function isFronleichnamValidForZip($workZip, $hint) {
        // Parse hint for specific cities/regions mentioned
        // This is a simplified implementation - you'd need detailed mapping

        // Saxon specific municipalities mentioned in hint
        if (strpos($hint, 'sorbischen Siedlungsgebietes') !== false) {
            // Saxony specific ZIP ranges for Sorbian areas
            $sorbianZips = ['02625', '02627', '02694', '02699', '02906', '02929', '02957', '02999'];
            return in_array($workZip, $sorbianZips);
        }

        // Thuringian specific areas
        if (strpos($hint, 'Landkreis Eichsfeld') !== false) {
            // Eichsfeld area ZIP codes
            return substr($workZip, 0, 3) === '373' || substr($workZip, 0, 3) === '374';
        }
        return true; // Default to valid if we can't determine specifics
    }
    public function indexVacationStats(User $_) {
        return $_->vacation_grants()->with('vacations')->get();
    }
    public function destroy(Vacation $vacation) {
        if ($vacation->grant->user_id != request()->user()->id && $vacation->state !== VacationState::Open) {
            return response('cannot delete already approved requests', 400);
        }
        $vacation->delete();
    }
    public function showGrant(VacationGrant $grant) {
        if (! $this->validateAccessPool($grant)) {
            return response('not permitted', 400);
        }
        return $grant->load('vacations');
    }
    public function destroyGrant(VacationGrant $grant) {
        if ($grant->vacations()->where('state', VacationState::Approved)->count() > 0) {
            return response('cannot delete grant with approved vacations', 400);
        }
        $sickNotes = $grant->vacations()->where('state', VacationState::Sick);
        if ($sickNotes->count() > 0) {
            $latestGrant = VacationGrant::where('user_id', $grant->user_id)
                ->where('id', '!=', $grant->id)
                ->latest()
                ->first();
            if (! $latestGrant) {
                return response('cannot delete: sick notes exist but no other grant to reassign them to', 400);
            }
            $sickNotes->update(['vacation_grant_id' => $latestGrant->id]);
        }
        $grant->delete();
    }
    public function show(Vacation $vacation) {
        if (! $this->validateAccess($vacation)) {
            return response('not permitted', 400);
        }
        return $vacation->load('user', 'grant', 'approved_by');
    }
    public function revoke(Vacation $vacation) {
        $isOwner = $vacation->grant->user_id === request()->user()->id;
        $isHR    = request()->user()->hasAnyRole(['admin', 'hr']);
        abort_if(!$isOwner && !$isHR, 403);
        abort_if($vacation->state !== VacationState::Open && $vacation->state !== VacationState::Approved, 422, 'Only open or approved vacation requests can be revoked.');
        abort_if(\Carbon\Carbon::parse($vacation->started_at)->startOfDay()->lte(today()), 422, 'Cannot revoke past vacations.');
        $vacation->update(['state' => VacationState::Cancelled]);
        return $vacation;
    }
    public function approve(Vacation $vacation) {
        request()->validate([
            'state' => 'required|in:1,2,4',
        ]);
        $data                     = $this->getBody();
        $vacation->state          = $data->state;
        $vacation->approved_by_id = request()->user()->id;
        $vacation->approved_at    = now();
        $vacation->save();
        Mail::to($vacation->user->email)->send(new VacationMail($vacation, $data->state, @$data->reason, request()->user()));
        return $vacation;
    }
    public function acknowledge(Vacation $_) {
        $_->update([
            'approved_by_id' => request()->user()->id,
            'approved_at'    => now(),
        ]);
        $_->save();
        return $_;
    }
    public function store() {
        request()->validate([
            'amount'            => 'required|numeric|lt:0',
            'state'             => 'required|numeric|in:0',
            'started_at'        => 'required|date',
            'ended_at'          => 'required|date',
            'vacation_grant_id' => [
                'required',
                function (string $att, mixed $val, Closure $fail) {
                    if (! ($v = VacationGrant::find($val))) {
                        $fail('no valid grant pool');
                    }
                    if ($v->user_id != request()->user()->id) {
                        $fail('not your grant pool');
                    }
                },
            ],
        ]);
        if (! $this->validateAccessPool(VacationGrant::find(request('vacation_grant_id')))) {
            response('not permitted', 400);
        }
        $payload                                          = request()->all();
        isset($payload['comment']) || $payload['comment'] = '';
        $v                                                = Vacation::create($payload);
        return $v;
    }
    public function storeSickNote() {
        request()->validate([
            'started_at' => 'required|date',
            'ended_at'   => 'required|date',
            'comment'    => 'string',
            'user_id'    => 'nullable|exists:App\Models\User,id',
        ]);

        $userId = request('user_id') ?? request()->user()->id;

        if ($userId != request()->user()->id && !request()->user()->hasAnyRole(['admin', 'hr'])) {
            return response('not permitted', 403);
        }

        $grant = VacationGrant::where('user_id', $userId)->where('expires_at', '>', now())->latest()->first();
        if ($grant) {
            $v = Vacation::create([
                'amount'            => 0,
                'state'             => VacationState::Sick,
                'started_at'        => request('started_at'),
                'ended_at'          => request('ended_at'),
                'comment'           => request('comment'),
                'vacation_grant_id' => $grant->id,
            ]);
            return $v;
        } else {
            return response('no grant found', 404);
        }
    }
    public function storeGrant() {
        request()->validate([
            'user_id'    => 'required|exists:App\Models\User,id',
            'name'       => 'required|string',
            'expires_at' => 'required|date',
            'amount'     => 'required|numeric|gt:0',
        ]);
        $validated = request()->only(['amount', 'user_id', 'expires_at', 'name']);
        return VacationGrant::create($validated);
    }
    public function storeManual() {
        request()->validate([
            'started_at'        => 'required|date',
            'vacation_grant_id' => [
                'required',
                function (string $att, mixed $val, Closure $fail) {
                    if (! ($v = VacationGrant::find($val))) {
                        $fail('no valid grant pool');
                    }
                },
            ],
        ]);
        if (! $this->validateAccessPool(VacationGrant::find(request('vacation_grant_id')))) {
            response('not permitted', 400);
        }
        $payload          = (new Vacation)->getValidFields(request()->all());
        $payload['state'] = VacationState::Approved;
        $v                = Vacation::create($payload);
        return $v->fresh();
    }
    private function validateAccess(Vacation $vacation): bool {
        return $this->validateAccessPool($vacation->grant);
    }
    private function validateAccessPool(VacationGrant $grant): bool {
        if ($grant->user_id == request()->user()->id) {
            return true;
        }
        if (request()->user()->hasAnyRole(['admin', 'hr'])) {
            return true;
        }
        return false;
    }
}
