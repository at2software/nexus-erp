import { Injectable } from '@angular/core';
import { NexusHttpService } from './http/http.nexus';

@Injectable({ providedIn: 'root' })
export class SearchService extends NexusHttpService<any> {
    apiPath = 'search';

    search = (query: string, filters: any = {}) => this.post('search', Object.assign(filters, { query: query }));

    getCommands = () => this.get('commands');
    executeCommand = (command: string, args: any = {}) => this.post('commands/execute', { command, arguments: args });
}
