<?php

namespace App\Traits;

trait ProvidesFileIcons {
    protected function getDefaultThumbnail(): string {
        $iconMap = [
            'application/pdf'                                                           => $this->getPdfIcon(),
            'application/msword'                                                        => $this->getDocIcon(),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   => $this->getDocIcon(),
            'application/vnd.ms-excel'                                                  => $this->getXlsIcon(),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'         => $this->getXlsIcon(),
            'application/vnd.ms-powerpoint'                                             => $this->getPptIcon(),
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => $this->getPptIcon(),
        ];

        if (isset($iconMap[$this->mime])) {
            return $iconMap[$this->mime];
        }

        if (str_starts_with($this->mime, 'video/')) {
            return $this->getVideoIcon();
        }

        if (str_starts_with($this->mime, 'audio/')) {
            return $this->getAudioIcon();
        }

        if (str_starts_with($this->mime, 'text/')) {
            return $this->getTextIcon();
        }
        return $this->getGenericIcon();
    }
    protected function getPdfIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#dc3545"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 9V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getDocIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#0d6efd"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getXlsIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#198754"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getPptIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#fd7e14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getVideoIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#6f42c1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM10 16l6-4-6-4v8zm3-7V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getAudioIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#20c997"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM12 18c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm1-9V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getTextIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#6c757d"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V8h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
    protected function getGenericIcon(): string {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#6c757d"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 9V3.5L18.5 9H13z"/></svg>';
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }
}
