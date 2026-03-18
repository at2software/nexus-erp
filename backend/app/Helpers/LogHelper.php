<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Log;

class LogHelper {
    /**
     * Get the calling context (class, method, line) from the stack trace
     */
    private static function getCallingContext(): string {
        $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 3);

        // Skip this helper method and get the actual caller
        $caller = $backtrace[2] ?? $backtrace[1] ?? [];

        $class    = $caller['class'] ?? 'Unknown';
        $function = $caller['function'] ?? 'Unknown';
        $line     = $caller['line'] ?? 0;

        // Extract just the class name without namespace
        $className = class_basename($class);
        return "<{$className}.{$function}:[{$line}]>";
    }

    /**
     * Log an info message with calling context
     */
    public static function info(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::info("{$prefix} {$message}", $context);
    }

    /**
     * Log an error message with calling context
     */
    public static function error(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::error("{$prefix} {$message}", $context);
    }

    /**
     * Log a warning message with calling context
     */
    public static function warning(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::warning("{$prefix} {$message}", $context);
    }

    /**
     * Log a debug message with calling context
     */
    public static function debug(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::debug("{$prefix} {$message}", $context);
    }

    /**
     * Log a critical message with calling context
     */
    public static function critical(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::critical("{$prefix} {$message}", $context);
    }

    /**
     * Log an alert message with calling context
     */
    public static function alert(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::alert("{$prefix} {$message}", $context);
    }

    /**
     * Log an emergency message with calling context
     */
    public static function emergency(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::emergency("{$prefix} {$message}", $context);
    }

    /**
     * Log a notice message with calling context
     */
    public static function notice(string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::notice("{$prefix} {$message}", $context);
    }

    /**
     * Log at any level with calling context
     */
    public static function log(string $level, string $message, array $context = []): void {
        $prefix = self::getCallingContext();
        Log::log($level, "{$prefix} {$message}", $context);
    }
}
