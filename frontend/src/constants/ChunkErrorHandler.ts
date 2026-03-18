import { Injectable, ErrorHandler } from "@angular/core";

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
    handleError(error: any) {
        const errorMessage = error?.message || '';
        const isChunkError = errorMessage.includes('ChunkLoadError') || 
                            errorMessage.includes('Loading chunk') ||
                            errorMessage.includes('dynamically imported module') ||
                            errorMessage.includes('Laden fehlgeschlagen für das Modul');
        
        if (isChunkError) {
            console.warn('Chunk failed to load. Prompting user to refresh.', error);
            if (confirm('A new version of the application is available. Would you like to refresh the page?')) {
                location.reload();
            }
        } else {
            //console.trace()
            console.error(error);
        }
    }
}