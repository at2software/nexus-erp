<?php

namespace App\Console\Commands;

use App\Models\File;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanThumbnailsCommand extends Command {
    protected $signature   = 'thumbnails:clean {--force : Force delete without confirmation}';
    protected $description = 'Clean up orphaned thumbnail files and regenerate missing ones';

    public function handle() {
        $this->info('Cleaning thumbnail cache...');

        // Get all thumbnail files
        $thumbnailFiles = Storage::files('thumbnails');
        $this->info('Found '.count($thumbnailFiles).' thumbnail files');

        // Get all file IDs that should have thumbnails
        $fileIds            = File::whereNotNull('mime')->pluck('id')->toArray();
        $expectedThumbnails = array_map(fn ($id) => "thumbnails/{$id}.webp", $fileIds);

        // Find orphaned thumbnails (thumbnails without corresponding files)
        $orphanedThumbnails = array_diff($thumbnailFiles, $expectedThumbnails);

        if (count($orphanedThumbnails) > 0) {
            $this->warn('Found '.count($orphanedThumbnails).' orphaned thumbnails');

            if ($this->option('force') || $this->confirm('Delete orphaned thumbnails?')) {
                foreach ($orphanedThumbnails as $orphan) {
                    Storage::delete($orphan);
                    $this->line("Deleted: {$orphan}");
                }
                $this->info('Deleted '.count($orphanedThumbnails).' orphaned thumbnails');
            }
        } else {
            $this->info('No orphaned thumbnails found');
        }

        // Find missing thumbnails (files that should have thumbnails but don't)
        $missingThumbnails = array_diff($expectedThumbnails, $thumbnailFiles);

        if (count($missingThumbnails) > 0) {
            $this->info('Found '.count($missingThumbnails).' missing thumbnails');

            if ($this->option('force') || $this->confirm('Regenerate missing thumbnails?')) {
                $progressBar = $this->output->createProgressBar(count($missingThumbnails));
                $progressBar->start();

                foreach ($missingThumbnails as $missingThumbnail) {
                    // Extract file ID from thumbnail path
                    $fileId = basename($missingThumbnail, '.webp');
                    $file   = File::find($fileId);

                    if ($file) {
                        try {
                            // Trigger thumbnail generation by accessing the attribute
                            $thumbnail = $file->thumbnail;

                            if ($thumbnail) {
                                $this->line("\nGenerated thumbnail for file: {$file->name}");
                            } else {
                                $this->line("\nFailed to generate thumbnail for file: {$file->name}");
                            }
                        } catch (\Exception $e) {
                            $this->line("\nError generating thumbnail for file {$file->name}: ".$e->getMessage());
                        }
                    }

                    $progressBar->advance();
                }

                $progressBar->finish();
                $this->line('');
                $this->info('Finished regenerating thumbnails');
            }
        } else {
            $this->info('No missing thumbnails found');
        }

        $this->info('Thumbnail cleanup completed!');
    }
}
