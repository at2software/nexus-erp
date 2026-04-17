<?php

namespace App\Models;

use App\Actions\File\GenerateImageThumbnail;
use App\Actions\File\GeneratePdfThumbnailWithGhostscript;
use App\Actions\File\GeneratePdfThumbnailWithImagick;
use App\Helpers\NLog;
use App\Traits\HandlesFileOperations;
use App\Traits\ProvidesFileIcons;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;

class File extends BaseModel {
    use HandlesFileOperations;
    use HasFactory;
    use ProvidesFileIcons;

    protected $fillable = ['name', 'parent_type', 'parent_id', 'dir', 'mime', 'category', 'tags', 'file_size', 'dimensions', 'uploaded_by'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    public function parent() {
        return $this->morphTo();
    }
    public function getThumbnailAttribute(): ?string {
        if (! $this->mime) {
            return null;
        }

        $thumbnailPath = "thumbnails/{$this->id}.webp";

        if (! Storage::exists($thumbnailPath)) {
            $this->generateThumbnail();
        }

        if (Storage::exists($thumbnailPath)) {
            $imageData = Storage::get($thumbnailPath);
            return 'data:image/webp;base64,'.base64_encode($imageData);
        }
        return $this->getDefaultThumbnail();
    }
    protected function generateThumbnail(): void {
        if (! Storage::exists($this->dir)) {
            return;
        }

        $thumbnailPath = "thumbnails/{$this->id}.webp";

        try {
            if (str_starts_with($this->mime, 'image/')) {
                app(GenerateImageThumbnail::class)->execute($this->dir, $thumbnailPath);
            } elseif ($this->mime === 'application/pdf') {
                $this->generatePdfThumbnail($thumbnailPath);
            }
        } catch (\Exception $e) {
            NLog::warning("Failed to generate thumbnail for file {$this->id}: ".$e->getMessage());
        }
    }
    protected function generatePdfThumbnail(string $thumbnailPath): void {
        $imagickAction = app(GeneratePdfThumbnailWithImagick::class);

        if ($imagickAction->execute($this->dir, $thumbnailPath)) {
            return;
        }

        $ghostscriptAction = app(GeneratePdfThumbnailWithGhostscript::class);
        $ghostscriptAction->execute($this->dir, $thumbnailPath);
    }
}
