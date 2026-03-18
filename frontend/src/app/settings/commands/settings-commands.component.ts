import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '@models/search.service';

interface Command {
  name: string;
  description: string;
  category: string;
  class: string;
  schedule?: string | null;
}

interface CommandExecution {
  success: boolean;
  exit_code?: number;
  output?: string;
  error?: string;
  command: string;
  executed_at?: string;
  executed_by?: string;
}

@Component({
  selector: 'settings-commands',
  templateUrl: './settings-commands.component.html',
  styleUrls: ['./settings-commands.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SettingsCommandsComponent implements OnInit {
  #searchService = inject(SearchService);

  commands: Record<string, Command[]> = {};
  loading = true;
  executing: Record<string, boolean> = {};
  executionResults: Record<string, CommandExecution> = {};

  ngOnInit() {
    this.loading = true;
    this.#searchService.getCommands().subscribe(data => {
      this.commands = data;
      this.loading = false;
    });
  }

  executeCommand(command: Command) {
    this.executing[command.name] = true;
    delete this.executionResults[command.name];
    this.#searchService.executeCommand(command.name).subscribe(result => {
      this.executionResults[command.name] = result;
      this.executing[command.name] = false;
    });
  }

  isExecuting(commandName: string): boolean {
    return this.executing[commandName] || false;
  }

  getExecutionResult(commandName: string): CommandExecution | undefined {
    return this.executionResults[commandName];
  }

  clearResult(commandName: string) {
    delete this.executionResults[commandName];
  }

  getCommandCategories(): string[] {
    return Object.keys(this.commands).sort();
  }

  getCommandsInCategory(category: string): Command[] {
    return this.commands[category] || [];
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Cronjobs': 'schedule',
      'HR': 'people',
      'Customers': 'business',
      'Finance': 'account_balance',
      'General': 'settings'
    };
    return icons[category] || 'code';
  }
}