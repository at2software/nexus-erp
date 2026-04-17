<?php

namespace App\Services;

use App\Http\Controllers\PluginGitController;
use App\Models\PluginLink;

class FrameworkDetectionService {
    public function detect(PluginGitController $git, PluginLink $link): array {
        if ($composerJson = $git->getFileContent($link, 'composer.json')) {
            $composer = json_decode($composerJson, true);
            if (isset($composer['require']['laravel/framework'])) {
                return ['framework' => 'laravel', 'version' => $composer['require']['laravel/framework']];
            }
        }

        if ($packageJson = $git->getFileContent($link, 'package.json')) {
            $package = json_decode($packageJson, true);
            if (isset($package['dependencies']['@angular/core'])) {
                return ['framework' => 'angular', 'version' => $package['dependencies']['@angular/core']];
            }
        }

        if ($tree = $git->getRepositoryTree($link)) {
            foreach ($tree as $item) {
                if ($item['type'] === 'tree' && str_ends_with($item['name'], '.xcodeproj')) {
                    $framework   = null;
                    $version     = null;
                    $pbxprojPath = $item['path'].'/project.pbxproj';
                    if ($pbxproj = $git->getFileContent($link, $pbxprojPath)) {
                        if (preg_match('/MACOSX_DEPLOYMENT_TARGET\s*=\s*([0-9.]+)/', $pbxproj, $matches)) {
                            $framework = 'macos';
                            $version   = $matches[1];
                        } elseif (preg_match('/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*([0-9.]+)/', $pbxproj, $matches)) {
                            $framework = 'ios';
                            $version   = $matches[1];
                        }
                    }
                    return ['framework' => $framework ?? 'ios', 'version' => $version];
                }
            }
        }

        $androidGradlePaths = ['app/build.gradle', 'app/build.gradle.kts', 'build.gradle', 'build.gradle.kts'];
        foreach ($androidGradlePaths as $path) {
            if ($buildGradle = $git->getFileContent($link, $path)) {
                $version = null;
                if (preg_match('/targetSdk(?:Version)?\s*[=:(\s]\s*(\d+)/', $buildGradle, $matches)) {
                    $version = $matches[1];
                } elseif (preg_match('/compileSdk(?:Version)?\s*[=:(\s]\s*(\d+)/', $buildGradle, $matches)) {
                    $version = $matches[1];
                }
                if ($version || strpos($buildGradle, 'com.android.application') !== false || strpos($buildGradle, 'com.android.library') !== false) {
                    return ['framework' => 'android', 'version' => $version];
                }
            }
        }
        return ['framework' => 'unknown', 'version' => null];
    }
}
