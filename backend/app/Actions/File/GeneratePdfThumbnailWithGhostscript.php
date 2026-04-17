<?php

namespace App\Actions\File;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Symfony\Component\Process\Process;

class GeneratePdfThumbnailWithGhostscript {
    public function execute(string $sourceDir, string $thumbnailPath): bool {
        if (! $this->isGhostscriptAvailable()) {
            return false;
        }
        return $this->generateThumbnail($sourceDir, $thumbnailPath);
    }
    private function gsExecutable(): string {
        return (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? 'gswin64c' : 'gs';
    }
    private function isGhostscriptAvailable(): bool {
        $process = new Process([$this->gsExecutable(), '-version']);
        try {
            $process->run();
        } catch (\Exception $e) {
            Log::info('Ghostscript not available for PDF thumbnail generation');
            return false;
        }
        if (! $process->isSuccessful()) {
            Log::info('Ghostscript not available for PDF thumbnail generation');
            return false;
        }
        return true;
    }
    private function generateThumbnail(string $sourceDir, string $thumbnailPath): bool {
        try {
            $sourceContent = Storage::get($sourceDir);
            $tempPdfFile   = tempnam(sys_get_temp_dir(), 'pdf_source').'.pdf';
            $tempImageFile = tempnam(sys_get_temp_dir(), 'pdf_thumb').'.png';

            if (! $this->validateTempFilePaths($tempPdfFile, $tempImageFile)) {
                return false;
            }

            file_put_contents($tempPdfFile, $sourceContent);

            $result = $this->executeGhostscript($tempPdfFile, $tempImageFile);

            if ($result && file_exists($tempImageFile)) {
                $this->convertToWebp($tempImageFile, $thumbnailPath);
                Log::info('Successfully generated PDF thumbnail using Ghostscript');
            } else {
                Log::warning('Ghostscript failed to generate PDF thumbnail');
            }

            $this->cleanup($tempPdfFile, $tempImageFile);
            return $result;
        } catch (\Exception $e) {
            Log::warning('Failed to generate PDF thumbnail with Ghostscript: '.$e->getMessage());
            return false;
        }
    }
    private function validateTempFilePaths(string $tempPdfFile, string $tempImageFile): bool {
        $tempDir = sys_get_temp_dir();
        if (strpos(realpath($tempPdfFile), realpath($tempDir)) !== 0 ||
            strpos(realpath($tempImageFile), realpath($tempDir)) !== 0) {
            Log::error('Invalid temp file path detected');
            return false;
        }
        if (! $this->isSafePath($tempPdfFile) || ! $this->isSafePath($tempImageFile)) {
            Log::error('Temp file path contains disallowed characters');
            return false;
        }
        return true;
    }
    private function isSafePath(string $path): bool {
        return (bool)preg_match('/^[a-zA-Z0-9_\-\/\\\\.]+$/', $path);
    }
    private function executeGhostscript(string $tempPdfFile, string $tempImageFile): bool {
        $realPdfFile = realpath($tempPdfFile);
        $imgDir      = realpath(dirname($tempImageFile));
        $imgBasename = basename($tempImageFile);

        if ($realPdfFile === false || $imgDir === false ||
            ! $this->isSafePath($realPdfFile) ||
            ! $this->isSafePath($imgDir) ||
            ! $this->isSafePath($imgBasename)) {
            return false;
        }

        $safeImageFile = $imgDir.DIRECTORY_SEPARATOR.$imgBasename;

        $process = new Process([
            $this->gsExecutable(),
            '-dNOPAUSE',
            '-dBATCH',
            '-dSAFER',
            '-sDEVICE=png16m',
            '-dFirstPage=1',
            '-dLastPage=1',
            '-r150',
            '-dTextAlphaBits=4',
            '-dGraphicsAlphaBits=4',
            '-dBackgroundColor=16#ffffff',
            '-sOutputFile='.$safeImageFile,
            $realPdfFile,
        ]);

        try {
            $process->run();
        } catch (\Exception $e) {
            Log::warning('Failed to execute Ghostscript: '.$e->getMessage());
            return false;
        }
        return $process->isSuccessful();
    }
    private function convertToWebp(string $tempImageFile, string $thumbnailPath): void {
        $manager = new ImageManager(new Driver);
        $image   = $manager->read($tempImageFile);

        $width  = $image->width();
        $height = $image->height();
        $canvas = $manager->create($width, $height)->fill('ffffff');

        $canvas->place($image, 'top-left');
        $canvas->coverDown(150, 150);
        $webpData = $canvas->toWebp(80);

        Storage::put($thumbnailPath, (string)$webpData);
    }
    private function cleanup(string $tempPdfFile, string $tempImageFile): void {
        if (file_exists($tempPdfFile)) {
            unlink($tempPdfFile);
        }
        if (file_exists($tempImageFile)) {
            unlink($tempImageFile);
        }
    }
}
