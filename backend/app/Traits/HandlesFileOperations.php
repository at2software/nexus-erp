<?php

namespace App\Traits;

use Illuminate\Support\Facades\Storage;

trait HandlesFileOperations {
    public static function stream(string $dir, string $filename) {
        return Storage::download($dir, $filename, self::headers($filename));
    }
    public static function streamPdf($data, string $filename) {
        return response($data)->withHeaders(self::headers($filename, 'application/pdf'));
    }
    public static function headers(string $filename, ?string $mimetype = null): array {
        $headers = [
            'Content-Disposition'           => 'attachment; filename="'.$filename.'"',
            'Access-Control-Expose-Headers' => 'Content-Type, Content-Disposition',
        ];

        if ($mimetype) {
            $headers['Content-Type'] = $mimetype;
        }
        return $headers;
    }
    public static function filename_safe(string $file): string {
        $file = mb_ereg_replace("([^\w\s\d\-_~,;\[\]\(\).])", '', $file);
        $file = mb_ereg_replace("([\.]{2,})", '', $file);
        return $file;
    }
    public static function saveTo(string $path, $data, $parent, ?string $permissions = null) {
        $parts    = explode('/', $path);
        $fileName = array_pop($parts);

        $file = self::create([
            'name'        => $fileName,
            'dir'         => $path,
            'mime'        => 'application/pdf',
            'permissions' => $permissions,
            ...$parent->toPoly(),
        ]);

        Storage::put($path, $data);
        return $file;
    }
}
