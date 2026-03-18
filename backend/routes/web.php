<?php

use App\Http\Controllers\TeamMonitorController;
use Illuminate\Support\Facades\Route;

Route::middleware('apikey:X-Auth-Token,'.env('TEAM_MONITOR_API_KEY', ''))->get('/team-monitor', [TeamMonitorController::class, 'index']);
Route::get('/', fn () => view('welcome'));

// API-friendly login route to prevent RouteNotFoundException
Route::get('/login', function () {
    if (request()->expectsJson()) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }
    return view('welcome'); // Fallback for web requests
})->name('login');
