<?php

use Illuminate\Http\JsonResponse;

if (! function_exists('responseError')) {
    function responseError(string $title, string $message = 'Something went wrong', int $status = 400): JsonResponse {
        return response()->json(['error' => $title, 'error_description' => $message], $status);
    }
}

if (! function_exists('logStackTrace')) {
    function logStackTrace(string $message = 'Stack trace', int $limit = 10): array {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, $limit + 5);

        // Filter out internal functions
        $filtered = array_filter($trace, function ($item) {
            $file = $item['file'] ?? '';
            return ! str_contains($file, 'vendor/') &&
                   ! str_contains($file, '/vendor/') &&
                   ! str_contains($file, '\\vendor\\') &&
                   ! empty($file);
        });

        // Reformat for cleaner output
        $formatted = array_map(function ($item) {
            $file     = str_replace(base_path().DIRECTORY_SEPARATOR, '', $item['file'] ?? '');
            $line     = $item['line'] ?? '';
            $function = $item['function'] ?? '';
            $class    = isset($item['class']) ? $item['class'].$item['type'] : '';
            return "{$class}{$function}() at {$file}:{$line}";
        }, array_slice($filtered, 0, $limit));

        \App\Helpers\NLog::info($message, $formatted);
        return $formatted;
    }
}

if (! function_exists('logWithBindings')) {
    function logWithBindings($query, string $message = 'Query'): string {
        $sql      = $query->toSql();
        $bindings = $query->getBindings();

        // Replace ? with actual bindings
        $fullQuery = \Illuminate\Support\Str::replaceArray('?', collect($bindings)->map(function ($binding) {
            if (is_null($binding)) {
                return 'NULL';
            }
            if (is_bool($binding)) {
                return $binding ? 'TRUE' : 'FALSE';
            }
            if (is_string($binding)) {
                return "'".addslashes($binding)."'";
            }
            return $binding;
        })->toArray(), $sql);

        \App\Helpers\NLog::info($message.': '.$fullQuery);
        return $fullQuery;
    }
}
