import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';

export interface CsvColumnMapping {
    header: string;
    field: string;
}

export interface CsvImportResult {
    mappings: CsvColumnMapping[];
    rows: string[][];
    initiativeId: string;
    leadSourceId: number;
}

const TARGET_FIELDS = [
    { key: 'skip',        label: '— skip —' },
    { key: 'fn',          label: 'Full Name' },
    { key: 'family_name', label: 'Last Name' },
    { key: 'given_name',  label: 'First Name' },
    { key: 'org',         label: 'Company / Organization' },
    { key: 'email',       label: 'Email' },
    { key: 'tel',         label: 'Phone' },
    { key: 'url',         label: 'Website' },
    { key: 'location',    label: 'City / Location' },
    { key: 'role',        label: 'Role / Position' },
    { key: 'notes',       label: 'Notes' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-csv-import-modal',
    templateUrl: './marketing-csv-import-modal.component.html',
    standalone: true,
    imports: [FormsModule],
})
export class MarketingCsvImportModalComponent extends ModalBaseComponent<CsvImportResult> {
    allRows: string[][] = [];
    initiatives: MarketingInitiative[] = [];
    existingNames: string[] = [];

    mappings             = signal<CsvColumnMapping[]>([]);
    selectedInitiativeId = signal('');
    selectedLeadSourceId = signal(0);

    readonly targetFields = TARGET_FIELDS;

    selectedInitiative = computed(() => this.initiatives.find(i => String(i.id) === this.selectedInitiativeId()));

    previewRows = computed(() => this.allRows.slice(0, 3));

    duplicates = computed(() => {
        const orgIdx = this.mappings().findIndex(m => m.field === 'org');
        const fnIdx  = this.mappings().findIndex(m => m.field === 'fn');
        if (orgIdx === -1 && fnIdx === -1) return [];
        const existing = new Set(this.existingNames.map(n => n.toLowerCase()));
        return this.allRows.filter(row => {
            const byOrg = orgIdx >= 0 ? row[orgIdx]?.trim().toLowerCase() : '';
            const byFn  = fnIdx  >= 0 ? row[fnIdx]?.trim().toLowerCase()  : '';
            return (byOrg && existing.has(byOrg)) || (byFn && existing.has(byFn));
        });
    });

    newCount = computed(() => this.allRows.length - this.duplicates().length);

    canAccept = computed(() =>
        !!this.selectedInitiativeId() &&
        this.selectedLeadSourceId() > 0 &&
        this.mappings().some(m => m.field !== 'skip')
    );

    init(...args: any): void {
        const { headers, rows, initiatives, currentInitiativeId, existingNames } = args[0];
        this.allRows      = rows;
        this.initiatives  = initiatives;
        this.existingNames = existingNames ?? [];
        this.mappings.set((headers as string[]).map(h => ({ header: h, field: autoMapHeader(h) })));

        if (currentInitiativeId) {
            this.selectedInitiativeId.set(currentInitiativeId);
            const ini = initiatives.find((i: any) => String(i.id) === currentInitiativeId);
            const primary = ini?.channels?.find((c: any) => c.pivot?.is_primary);
            this.selectedLeadSourceId.set(primary?.id ?? ini?.channels?.[0]?.id ?? 0);
        }
    }

    setInitiative(id: string) {
        this.selectedInitiativeId.set(id);
        const ini = this.initiatives.find(i => String(i.id) === id);
        const primary = ini?.channels?.find((c: any) => c.pivot?.is_primary);
        this.selectedLeadSourceId.set(primary?.id ?? ini?.channels?.[0]?.id ?? 0);
    }

    updateMapping(index: number, field: string) {
        this.mappings.update(m => m.map((item, i) => i === index ? { ...item, field } : item));
    }

    onSuccess(): CsvImportResult {
        return {
            mappings:      this.mappings(),
            rows:          this.allRows,
            initiativeId:  this.selectedInitiativeId(),
            leadSourceId:  this.selectedLeadSourceId(),
        };
    }
}

function autoMapHeader(header: string): string {
    const h = header.toLowerCase().trim();
    if (/^(nr\.?|#|id|lfd\.?\s*nr\.?)$/.test(h))                                                   return 'skip';
    if (h.includes('unternehmen') || h.includes('company') || h.includes('firma'))                  return 'org';
    if (h === 'name' || h === 'vollname' || h.includes('full name'))                                return 'fn';
    if (h.includes('nachname') || h.includes('familienname') || h.includes('last name'))            return 'family_name';
    if (h.includes('vorname') || h.includes('givenname') || h.includes('first name'))              return 'given_name';
    if (h.includes('email') || h.includes('e-mail') || h === 'mail')                               return 'email';
    if (h.includes('tel') || h.includes('phone') || h.includes('fon') || h.includes('mobil'))     return 'tel';
    if (h.includes('web') || h.includes('url') || h.includes('website') || h.includes('homepage')) return 'url';
    if (h.includes('standort') || h.includes('city') || h.includes('location') || h.includes('ort') || h.includes('stadt')) return 'location';
    if (h.includes('fokus') || h.includes('focus') || h.includes('role') || h.includes('position') || h.includes('branche')) return 'role';
    if (h.includes('notes') || h.includes('notiz') || h.includes('memo') || h.includes('anmerkung')) return 'notes';
    return 'skip';
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
    const content = text.replace(/^﻿/, '');
    const firstLine = content.split(/\r?\n/)[0] ?? '';
    const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

    const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
                else inQ = !inQ;
            } else if (ch === sep && !inQ) {
                result.push(cur.trim()); cur = '';
            } else {
                cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };

    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    return { headers: parseRow(lines[0]), rows: lines.slice(1).map(parseRow) };
}
