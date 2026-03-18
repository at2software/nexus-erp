import { FileService } from "./file.service";
import { Serializable } from "../serializable";
import { getFileActions } from "./file.actions";

enum MimeType {
    DEFAULT, IMAGE, APPLICATION
}

export class File extends Serializable {

    static API_PATH = (): string => 'files'
    SERVICE = FileService

    name       : string = ''
    dir        : string = ''
    parent_path: string = ''
    mime       : string = ''
    permissions: string|null = null

    // Marketing asset fields
    category?: string
    tags?: string[]
    file_size?: number
    dimensions?: string
    download_url?: string
    preview_url?: string
    thumbnail?: string // Base64 encoded thumbnail    
    
    doubleClickAction: number = 0
    actions = getFileActions(this)
    
    serialize = () => {
        this.colorCss = this.#getColorCss()
    }
    
    /**
     * Get Icon string for file type
     * @returns google fonts string
     */
    getIcon():string {
        if (this.mime === 'application/pdf') return 'picture_as_pdf'
        if (this.mime?.endsWith('document')) return 'article'
        if (this.name?.endsWith('.svg')) return 'polyline'
        if (this.mime?.startsWith('image/')) return 'photo'
        if (this.name?.endsWith('.txt')) return 'text'
        return ''
    }
    /**
     * Get color for file type
     * @returns hex or var color string
     */
    #getColorCss():string {
        switch (this.getMimeType()) {
            case MimeType.DEFAULT: return '#cccccc';
            case MimeType.IMAGE: return 'var(--color-purple)';
            case MimeType.APPLICATION: return 'var(--color-blue)';
        }
    }
    getMimeType():MimeType {
        if (this.mime?.startsWith('image/')) return MimeType.IMAGE
        if (this.mime?.startsWith('application/')) return MimeType.APPLICATION
        if (this.mime?.startsWith('text/')) return MimeType.DEFAULT
        return MimeType.DEFAULT
    }
}