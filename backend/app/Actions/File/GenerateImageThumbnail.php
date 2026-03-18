<?php

namespace App\Actions\File;

use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class GenerateImageThumbnail {
    public function execute(string $sourceDir, string $thumbnailPath): void {
        $sourceContent = Storage::get($sourceDir);

        $manager = new ImageManager(new Driver);
        $image   = $manager->read($sourceContent);

        $image->coverDown(150, 150);
        $webpData = $image->toWebp(80);

        Storage::put($thumbnailPath, (string)$webpData);
    }
}
