import { Injectable } from '@angular/core';
import { BaseHttpService } from './http.service';

@Injectable({providedIn: 'root'})
export class SearchService extends BaseHttpService {
  search = (query:string, filters:any = {}) => this.post('search', Object.assign(filters, {query: query}))

  getCommands = () => this.get('commands')
  executeCommand = (command: string, args: any = {}) => this.post('commands/execute', { command, arguments: args })

}
