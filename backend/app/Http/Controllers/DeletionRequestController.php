<?php

namespace App\Http\Controllers;

use App\Models\DeletionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeletionRequestController extends Controller {
    public function index() {
        return DeletionRequest::with(['user', 'model'])->latest()->get();
    }
    public function store(Request $request) {
        $data = $request->validate([
            'model_type' => 'required|string',
            'model_id'   => 'required',
            'reason'     => 'nullable|string',
        ]);

        $type = $data['model_type'];
        abort_unless(Str::startsWith($type, 'App\\Models\\') && class_exists($type), 422, 'Invalid model type');
        abort_unless($type::find($data['model_id']) !== null, 404, 'Target not found');

        return DeletionRequest::firstOrCreate(
            ['model_type' => $type, 'model_id' => $data['model_id']],
            ['user_id' => auth()->id(), 'reason' => $data['reason'] ?? null]
        )->load(['user', 'model']);
    }
    public function approve(DeletionRequest $deletionRequest) {
        $deletionRequest->approve();
        return response()->noContent();
    }
    public function destroy(DeletionRequest $deletionRequest) {
        $deletionRequest->delete();
        return response()->noContent();
    }
}
