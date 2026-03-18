<?php

namespace App\Actions\File;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GeneratePdfThumbnailWithImagick {
    public function execute(string $sourceDir, string $thumbnailPath): bool {
        if (! extension_loaded('imagick')) {
            Log::info('Imagick extension not available for PDF thumbnail generation');
            return false;
        }

        try {
            $sourceContent = Storage::get($sourceDir);
            $tempFile      = tempnam(sys_get_temp_dir(), 'pdf_thumb');
            file_put_contents($tempFile, $sourceContent);

            $imagick = new \Imagick;

            $imagick->setResolution(300, 300);
            $imagick->readImage($tempFile.'[0]');

            $imagick->setImageBackgroundColor(new \ImagickPixel('white'));
            $imagick->setImageAlphaChannel(\Imagick::ALPHACHANNEL_REMOVE);
            $imagick->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);

            $canvas = new \Imagick;
            $canvas->newImage($imagick->getImageWidth(), $imagick->getImageHeight(), new \ImagickPixel('white'));
            $canvas->setImageFormat('png');
            $canvas->compositeImage($imagick, \Imagick::COMPOSITE_OVER, 0, 0);

            $canvas->thumbnailImage(150, 150, true);

            $canvas->setImageFormat('webp');
            $canvas->setImageCompressionQuality(80);

            Storage::put($thumbnailPath, $canvas->getImageBlob());

            $imagick->destroy();
            $canvas->destroy();
            unlink($tempFile);
            return true;
        } catch (\Exception $e) {
            Log::warning('Failed to generate PDF thumbnail with Imagick: '.$e->getMessage());
            return false;
        }
    }
}
