<?php

namespace App\Traits;

use App\Models\Company;
use App\Models\Param;
use App\Models\Project;

trait HasFocusDisplay {
    public function getFocusDisplayData(): array {
        $focusName    = $this->current_focus?->name ?? '';
        $focusColor   = '#00C9A7';
        $availability = 'user-offline';

        switch ($this->availability_status) {
            case 1:
                $availability = '';
                break;
            case 0:
                $focusName = '';
                break;
            case -1:
                $focusName  = 'Urlaub';
                $focusColor = '#00C000';
                break;
            case -2:
                $focusName  = 'Krank';
                $focusColor = '#00CED1';
                break;
        }

        if (($this->current_focus?->id == Param::get('ME_ID')->value) && ($this->current_focus_type === Company::class)) {
            $focusName  = 'Organisational';
            $focusColor = '#FFA200';
        } elseif ($this->current_focus_type === Company::class) {
            if ($this->current_focus->accepts_support) {
                $focusColor = '#00C9A7';
            } else {
                $focusColor = '#FF6700';
                $focusName .= ' (unbezahlt)';
            }
        } elseif ($this->current_focus_type === Project::class) {
            if ($this->current_focus->company_id == 950) {
                $focusColor = '#FF6B00';
            } elseif ($this->current_focus->is_time_based) {
                $focusColor = '#00C9A7';
            } else {
                $focusColor = '#0A8BC9';
            }
        }
        return [
            'focus_name'   => $focusName,
            'focus_color'  => $focusColor,
            'availability' => $availability,
        ];
    }
}
