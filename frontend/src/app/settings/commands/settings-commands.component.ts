import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SearchService } from '@models/search.service';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

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

const CATEGORY_ICONS: Record<string, string> = {
    Cronjobs: 'schedule',
    HR: 'people',
    Customers: 'business',
    Finance: 'account_balance',
    General: 'settings',
};

@Component({
    selector: 'settings-commands',
    templateUrl: './settings-commands.component.html',
    styleUrls: ['./settings-commands.component.scss'],
    standalone: true,
    imports: [DatePipe, SpinnerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsCommandsComponent {
    loading = signal(true);
    commands = signal<Record<string, Command[]>>({});
    categories = computed(() => Object.keys(this.commands()).sort());

    #searchService = inject(SearchService);
    #executing = signal<Set<string>>(new Set());
    #executionResults = signal<Record<string, CommandExecution>>({});

    constructor() {
        this.#searchService.getCommands().subscribe((data) => {
            this.commands.set(data);
            this.loading.set(false);
        });
    }

    executeCommand(command: Command) {
        this.#executing.update((s) => new Set(s).add(command.name));
        this.#executionResults.update((r) => { const n = { ...r }; delete n[command.name]; return n; });
        this.#searchService.executeCommand(command.name).subscribe((result) => {
            this.#executionResults.update((r) => ({ ...r, [command.name]: result }));
            this.#executing.update((s) => { const n = new Set(s); n.delete(command.name); return n; });
        });
    }

    isExecuting = (commandName: string) => this.#executing().has(commandName);
    getExecutionResult = (commandName: string) => this.#executionResults()[commandName];
    clearResult = (commandName: string) => this.#executionResults.update((r) => { const n = { ...r }; delete n[commandName]; return n; });
    categoryIcon = (category: string) => CATEGORY_ICONS[category] ?? 'code';
}
