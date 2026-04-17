<?php

namespace App\Http\Controllers;

use App\DAV\OwnCalDAVBackend;
use App\Models\CalendarEntry;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CalendarController extends Controller {
    use ControllerHasPermissionsTrait;

    public function index() {
        $pdo               = DB::connection()->getPdo();
        $ownCalDAVBackend  = new OwnCalDAVBackend($pdo);
        $calendarObjects   = $ownCalDAVBackend->getCalendarObjects([0, 0]);
        $calendarDataArray = [];
        $index             = 1;
        $calendarDataArray = collect($calendarObjects)
            ->filter(fn ($calendarObject) => isset($calendarObject['uri']) && strpos($calendarObject['uri'], 'calendarEntry_') !== 0)
            ->map(function ($calendarObject) use ($ownCalDAVBackend, &$index) {
                $fullCalendarObject = $ownCalDAVBackend->getCalendarObject([0, 0], $calendarObject['uri']);
                if (isset($fullCalendarObject['calendardata'])) {
                    return [
                        'id'          => -1 * $index++,
                        'vcalendar'   => $fullCalendarObject['calendardata'],
                        'is_editable' => false,
                    ];
                }
                return null;
            })
            ->filter()
            ->values()
            ->toArray();

        $calendarEntries   = CalendarEntry::select(['id', 'vcalendar'])->get();
        $calendarDataArray = array_merge($calendarDataArray, $calendarEntries->map(function ($calendarEntry) {
            return [
                'id'          => $calendarEntry->id,
                'vcalendar'   => $calendarEntry->vcalendar,
                'is_editable' => true,
            ];
        })->toArray());
        return response()->json($calendarDataArray);
    }
    public function store(CalendarEntry $focus) {
        request()->validate([
            'vcalendar' => 'required|string',
        ]);
        $vcalendar = request('vcalendar');
        if (! preg_match('/^UID:/m', $vcalendar)) {
            $newUID         = uniqid();
            $vcalendarLines = explode("\n", $vcalendar);
            array_splice($vcalendarLines, 1, 0, "UID:$newUID");
            $vcalendar = implode("\n", $vcalendarLines);
        }
        return CalendarEntry::create([
            'vcalendar' => $vcalendar,
        ]);
    }
    public function update(Request $request, CalendarEntry $calendarEntry) {
        $request->validate([
            'vcalendar' => 'required|string',
        ]);
        $calendarEntry->vcalendar = request('vcalendar');
        $calendarEntry->save();
        return $calendarEntry;
    }
    public function destroy(CalendarEntry $calendarEntry) {
        return $calendarEntry->delete();
    }
}
