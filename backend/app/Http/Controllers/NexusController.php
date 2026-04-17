<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use Illuminate\Http\Request;

/**
 * For unspecific requests that can return multiple object types
 */
class NexusController extends Controller {
    public function attention(Request $request) {
        $fnStr = function ($fs, $o) {
            return is_callable($fs) ? $fs($o) : $fs;
        };
        $fnMerge = function (&$array, $with, $title = '', $label = '') use ($fnStr) {
            $with = $with
                ->get()
                ->append('class')
                ->append('icon')
                ->each(function ($item) use ($fnStr, $title, $label) {
                    $item->attentionLabel = $fnStr($label, $item);
                    $item->attentionTitle = $fnStr($title, $item);
                })
                ->toArray();
            $array = array_merge($array, $with);
        };

        $return = [];
        // add overdue invoices
        $fnMerge($return, Invoice::where('due_at', '<', now())->where('paid_at', null),
            function ($x) {
                return $x->name;
            },
            'Overdue invoice'
        );
        // add overdue projects
        $fnMerge($return, Project::where('due_at', '<', now())->where('state', 'in_progress'),
            function ($x) {
                return $x->name;
            },
            'Deadline overdue'
        );
        return $return;
    }
    public function icon() {
        $d  = file_get_contents(resource_path('icons/synapse.png'));
        $im = imagecreatefromstring($d);
        imagepng($im);
        $photo        = ob_get_clean();
        $browserCache = 60 * 60 * 24 * 7;
        return response($photo)
            ->header('Content-type', 'image/png')
            ->header('Cache-Control', 'private, max-age='.$browserCache)
            ->header('Expires', gmdate('D, d M Y H:i:s', time() + $browserCache).' GMT')
            ->header('Content-Length', strlen($photo))
            ->header('Last-Modified', $this->modified_at)
            ->header('ETag', hash('sha256', $photo));
    }
    public function populateClipboard(Request $request) {
        $data     = (array)$this->getBody();
        $response = [];
        foreach ($data as $class => $ids) {
            $response[$class] = [];
            foreach ($ids as $id) {
                $model = app('App\\Models\\'.$class);
                if ($obj = $model::find($id)) {
                    if ($obj->canBeAccessedByUser()) {
                        $response[$class][] = $obj;
                    }
                }
            }
        }
        return $response;
    }

    /**
     * helper function to die a stacktrace
     *
     * @throws \Exception
     */
    public static function dieDebugBacktrace($title = 'backtrace') {
        try {
            throw new \Exception("<$title>");
        } catch (\Exception $e) {
            report($e);
            exit();
        }
    }
}
