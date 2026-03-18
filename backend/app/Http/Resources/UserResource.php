<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource {
    public function toArray($request): array {
        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'email'                => $this->email,
            'color'                => $this->color,
            'icon'                 => $this->icon,
            'class'                => $this->class,
            'path'                 => $this->path,
            'gender'               => $this->gender,
            'is_retired'           => $this->is_retired,
            'is_sick'              => $this->is_sick,
            'is_on_vacation'       => $this->is_on_vacation,
            'availability_status'  => $this->availability_status,
            'vcard'                => $this->vcard,
            'work_zip'             => $this->work_zip,
            'current_focus_id'     => $this->current_focus_id,
            'current_focus_type'   => $this->current_focus_type,
            'current_focus'        => $this->whenLoaded('current_focus'),
            'active_employment'    => $this->whenLoaded('activeEmployment'),
            'role_names'           => $this->role_names,
            'latest_foci'          => $this->when($this->relationLoaded('foci'), fn () => $this->latest_foci),
            'created_at'           => $this->created_at,
            'updated_at'           => $this->updated_at,
        ];
    }
}
