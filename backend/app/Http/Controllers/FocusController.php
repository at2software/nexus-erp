<?php

namespace App\Http\Controllers;

use App\Models\BaseModel;
use App\Models\Company;
use App\Models\Focus;
use App\Models\Param;
use App\Models\User;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;

class FocusController extends Controller {
    use ControllerHasPermissionsTrait;

    public function update(Request $request, int $id) {
        $request->validate([
            'started_at'  => 'sometimes|date',
            'duration'    => 'sometimes|numeric',
            'parent_path' => 'poly_exists:parent_id,parent_type',
        ]);
        $_ = Focus::findOrFail($id);
        $_->applyAndSave($request);
        if ($path = request('parent_path')) {
            $newParent = BaseModel::fromPath($path);
            $_->parent()->associate($newParent);
        }
        $_->touch();
        return $_;
    }
    public function store(Focus $focus) {
        request()->validate([
            'date'     => 'required|date',
            'user_id'  => 'required|exists:App\Models\User,id',
            'duration' => 'required|numeric',
        ]);
        $user = User::find(request('user_id'));
        return $user->foci()->create([
            'started_at'  => request('date'),
            'duration'    => request('duration'),
            'parent_type' => Company::class,
            'parent_id'   => Param::get('ME_ID')->value,
        ]);
    }
    public function destroy(Focus $focus) {
        return $focus->delete();
    }
}
