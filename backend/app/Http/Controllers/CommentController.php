<?php

namespace App\Http\Controllers;

use App\Enums\CommentType;
use App\Http\Middleware\Auth;
use App\Models\Comment;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;

class CommentController extends Controller {
    use ControllerHasPermissionsTrait;

    public function store(Request $request) {
        $new     = new Comment;
        $parent  = Comment::fromPath($request->path);
        $payload = [
            ...$new->getValidFields($request->all()),
            ...$parent->toPoly(),
            'user_id' => Auth::Id(),
        ];
        if (empty($payload['type'])) {
            $payload['type'] = CommentType::Default;
        }
        $new->fill($payload);
        $new->save();
        return $new->fresh();
    }
    public function update(Comment $comment) {
        return $comment->applyAndSaveRequest();
    }
    public function destroy(Comment $comment) {
        return $comment->delete();
    }
}
