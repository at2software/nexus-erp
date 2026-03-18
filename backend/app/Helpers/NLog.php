<?php

namespace App\Helpers;

/**
 * Nexus Log Helper - Enhanced logging with calling context
 *
 * Usage:
 * NLog::info('User logged in', ['user_id' => 123]);
 * NLog::error('Database connection failed');
 *
 * Output format: [timestamp] <ClassName.methodName:[line]>.LEVEL: message
 */
class NLog extends LogHelper {
    // This class inherits all methods from LogHelper
    // Just provides a shorter, more convenient name
}
