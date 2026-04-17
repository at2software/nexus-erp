<?php

namespace App\Http\Controllers;

use App\Events\SharingToggled;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LiveSharingController extends Controller {
    private const CACHE_KEY = 'live_sharing_active';
    private const CACHE_TTL = 3600;

    public function toggleSharing(Request $request) {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'url'     => 'required|string',
        ]);

        $user  = $request->user();
        $color = $user->color ?? '#3B82F6';

        $activeSharings = Cache::get(self::CACHE_KEY, []);

        if ($validated['enabled']) {
            $activeSharings[$user->id] = [
                'userId'    => $user->id,
                'userName'  => $user->name,
                'userColor' => $color,
                'url'       => $validated['url'],
            ];
        } else {
            unset($activeSharings[$user->id]);
        }

        Cache::put(self::CACHE_KEY, $activeSharings, self::CACHE_TTL);

        broadcast(new SharingToggled(
            $user->id,
            $user->name,
            $color,
            $validated['enabled'],
            $validated['url']
        ));
        return response()->json(['status' => 'success']);
    }
    public function getActiveSharings() {
        $activeSharings = Cache::get(self::CACHE_KEY, []);
        return response()->json(array_values($activeSharings));
    }
}
