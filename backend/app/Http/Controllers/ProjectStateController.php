<?php

namespace App\Http\Controllers;

use App\Models\ProjectState;
use Illuminate\Http\Request;

class ProjectStateController extends Controller {
    public function index() {
        return ProjectState::all();
    }

    public function update(Request $request, int $id) {
        $projectState = ProjectState::findOrFail($id);
        return $projectState->applyAndSave($request);
    }
}
