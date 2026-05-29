import { FileService } from './file.service';
import { Serializable } from '../serializable';
import { getFileActions } from './file.actions';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';

enum MimeType {
    DEFAULT,
    IMAGE,
    APPLICATION,
}

@Model('File')
export class File extends Serializable {
    static API_PATH = (): string => 'files';
    SERVICE = FileService;

    name: string = '';
    dir: string = '';
    parent_path: string = '';
    mime: string = '';
    permissions: string | null = null;

    // Marketing asset fields
    category?: string;
    tags?: string[];
    file_size?: number;
    dimensions?: string;
    download_url?: string;
    preview_url?: string;
    thumbnail?: string; // Base64 encoded thumbnail

    doubleClickAction: number = 0;
    actions = getFileActions(this);

    css = computed(() => this.#getColorCss(this.snapshot().mime));

    /**
     * Get Icon string for file type
     * @returns google fonts string
     */
    getIcon(): string {
        if (this.mime === 'application/pdf') return 'picture_as_pdf';
        if (this.mime?.endsWith('document')) return 'article';
        if (this.name?.endsWith('.svg')) return 'polyline';
        if (this.mime?.startsWith('image/')) return 'photo';
        if (this.name?.endsWith('.txt')) return 'text';
        return '';
    }
    /**
     * Get color for file type
     * @returns hex or var color string
     */
    #getColorCss(mime: string): string {
        switch (this.getMimeType(mime)) {
            case MimeType.DEFAULT:
                return '#cccccc';
            case MimeType.IMAGE:
                return 'var(--color-purple)';
            case MimeType.APPLICATION:
                return 'var(--color-blue)';
        }
    }
    getMimeType(mime = this.mime): MimeType {
        if (mime?.startsWith('image/')) return MimeType.IMAGE;
        if (mime?.startsWith('application/')) return MimeType.APPLICATION;
        return MimeType.DEFAULT;
    }
}
