<?php

namespace App\Actions\File;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class GeneratePdfThumbnailWithGhostscript {
    private const ALLOWED_GS_COMMANDS = [
        'gs',
        'gswin64c',
        'gswin32c',
        '/usr/bin/gs',
        '/usr/local/bin/gs',
    ];

    public function execute(string $sourceDir, string $thumbnailPath): bool {
        $gsCommand = $this->selectGhostscriptCommand();

        if (! $this->validateGsCommand($gsCommand)) {
            return false;
        }

        if (! $this->isGhostscriptAvailable($gsCommand)) {
            return false;
        }
        return $this->generateThumbnail($gsCommand, $sourceDir, $thumbnailPath);
    }
    private function selectGhostscriptCommand(): string {
        return (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? 'gswin64c' : 'gs';
    }
    private function validateGsCommand(string $gsCommand): bool {
        if (! in_array($gsCommand, self::ALLOWED_GS_COMMANDS, true)) {
            Log::warning("Ghostscript command not in whitelist: {$gsCommand}");
            return false;
        }
        return true;
    }
    private function isGhostscriptAvailable(string $gsCommand): bool {
        $descriptorspec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open(
            [$gsCommand, '-version'],
            $descriptorspec,
            $pipes,
            null,
            null
        );

        if (! is_resource($process)) {
            Log::info('Ghostscript not available for PDF thumbnail generation');
            return false;
        }

        $output = stream_get_contents($pipes[1]);
        $error  = stream_get_contents($pipes[2]);
        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $returnVar = proc_close($process);

        if ($returnVar !== 0) {
            Log::info('Ghostscript not available for PDF thumbnail generation');
            return false;
        }
        return true;
    }
    private function generateThumbnail(string $gsCommand, string $sourceDir, string $thumbnailPath): bool {
        try {
            $sourceContent = Storage::get($sourceDir);
            $tempPdfFile   = tempnam(sys_get_temp_dir(), 'pdf_source').'.pdf';
            $tempImageFile = tempnam(sys_get_temp_dir(), 'pdf_thumb').'.png';

            if (! $this->validateTempFilePaths($tempPdfFile, $tempImageFile)) {
                return false;
            }

            file_put_contents($tempPdfFile, $sourceContent);

            $result = $this->executeGhostscript($gsCommand, $tempPdfFile, $tempImageFile);

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
        return true;
    }
    private function executeGhostscript(string $gsCommand, string $tempPdfFile, string $tempImageFile): bool {
        $command = [
            $gsCommand,
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
            '-sOutputFile='.$tempImageFile,
            $tempPdfFile,
        ];

        $descriptorspec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open(
            $command,
            $descriptorspec,
            $pipes,
            null,
            null
        );

        if (! is_resource($process)) {
            Log::warning('Failed to execute Ghostscript');
            return false;
        }

        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        $error  = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $returnVar = proc_close($process);
        return $returnVar === 0;
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
