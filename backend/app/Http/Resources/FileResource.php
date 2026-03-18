<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FileResource extends JsonResource {
    public function toArray($request): array {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'dir'         => $this->dir,
            'mime'        => $this->mime,
            'category'    => $this->category,
            'tags'        => $this->tags,
            'file_size'   => $this->file_size,
            'dimensions'  => $this->dimensions,
            'uploaded_by' => $this->uploaded_by,
            'parent_type' => $this->parent_type,
            'parent_id'   => $this->parent_id,
            'thumbnail'   => $this->thumbnail,
            'parent'      => $this->whenLoaded('parent'),
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
