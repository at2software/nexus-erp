import { NxContextMenu } from '@app/nx/nx.contextmenu';
import type { INxContextMenu } from '@app/nx/nx.contextmenu.interface';

export class VcardRow implements INxContextMenu {

    static fromString(s: string): VcardRow | undefined {
        const [header, ...rest] = s.split(':');
        if (!rest.length) return undefined;
        const [key, ...mods] = header.split(';');
        const vals = rest.join(':').split(';');
        return new VcardRow(key, mods, vals);
    }

    track_id: number = NxContextMenu.getTrackId();
    info: Record<string, any> = {}

    actions = [{ title: 'Remove', hotkey: 'CTRL+DELETE', group: true }]

    constructor(
        public key: string,
        public mods: string[],
        public vals: string[]
    ) { }

    doubleClickAction: number;
    class: string;
    frontendUrl = () => '';
    getApiPathWithId = () => '';
    getType = (): string | undefined => this.#getTypeMod()?.replace(/^type=/i, '');
    setType(type: string): void {
        this.mods = this.mods.filter(x => !/^type=/i.test(x));
        this.mods.push(`type=${type}`);
    }
    contactIcon = (): string => {
        const k = this.key.toUpperCase();
        if (k === 'EMAIL') return 'email';
        if (k === 'TEL') {
            const type = this.getType()?.toLowerCase();
            if (type === 'cell') return 'smartphone';
            if (type === 'fax') return 'fax';
            return 'phone';
        }
        return '';
    };
    isSocialMedia = () => !['work', 'home'].includes(this.getType()?.toLowerCase() ?? 'work');
    isMobile = (): boolean => this.key.toUpperCase() == 'TEL' && this.mods.filter(x => x.match(/^type=.*cell/i)).length > 0
    val = (): string => this.vals.join('')
    type = (): string => this.getType()?.toUpperCase() ?? '';
    toString = (): string => `${this.key}${this.mods.length ? ';' + this.mods.join(';') : ''}:${this.vals.join(';')}`;
    
    #getTypeMod = () => this.mods.find(x => /^type=/i.test(x));
}