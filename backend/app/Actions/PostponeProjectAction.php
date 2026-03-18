<?php

namespace App\Actions;

use App\Models\Comment;
use App\Models\Project;

class PostponeProjectAction {
    private const POSTPONE_MAP = [
        1 => ['period' => 'weeks', 'amount' => 1, 'label' => '1 Wochen'],
        2 => ['period' => 'weeks', 'amount' => 2, 'label' => '2 Wochen'],
        3 => ['period' => 'months', 'amount' => 1, 'label' => '1 Monate'],
        4 => ['period' => 'months', 'amount' => 2, 'label' => '2 Monate'],
        5 => ['period' => 'months', 'amount' => 3, 'label' => '3 Monate'],
        6 => ['period' => 'months', 'amount' => 6, 'label' => '6 Monate'],
        7 => ['period' => 'months', 'amount' => 12, 'label' => '1 Jahr'],
    ];

    public function execute(Project $project, int $duration, string|null $comment = null): Project {
        $config = self::POSTPONE_MAP[$duration] ?? null;
        if (! $config) {
            return $project;
        }

        $due                = now();
        $method             = 'add'.ucfirst($config['period']);
        $project->remind_at = $due->$method($config['amount'])->toDateTimeString();

        $comment = strlen($comment) ? $comment . '<br>' : '';
        $comment .= 'Frist verlängert ('.$config['label'].')';
        $project->save();

        Comment::create([
            ...$project->toPoly(),
            'text'    => $comment,
            'user_id' => request()->user()->id,
            'is_mini' => true,
        ]);
        return $project;
    }
}
