<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;

class BaseCollection extends Collection {
    public function appendRequest() {
        if (! ($a = request('append'))) {
            return $this;
        }
        $appends = explode(',', $a);
        if (! count($appends)) {
            return $this;
        }
        $first = $this->first();
        if ($first) {
            $allowed = $first->allowedAppends ?? [];
            if (count($allowed)) {
                $appends = array_intersect($appends, $allowed);
            }
        }
        if (! count($appends)) {
            return $this;
        }
        return $this->append($appends);
    }
}
