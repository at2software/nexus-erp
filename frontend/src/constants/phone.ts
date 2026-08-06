
export interface PhoneInfo {
    icon: string;
    label: string;
    detail: string;
    warn?: boolean;
}

const DE_AREA_CODES: Record<string, string> = {
    '030': 'Berlin', '040': 'Hamburg', '089': 'München', '069': 'Frankfurt a. M.',
    '0201': 'Essen', '0202': 'Wuppertal', '0203': 'Duisburg', '0208': 'Oberhausen', '0209': 'Gelsenkirchen',
    '0211': 'Düsseldorf', '0221': 'Köln', '0228': 'Bonn', '0231': 'Dortmund', '0234': 'Bochum', '0241': 'Aachen',
    '0251': 'Münster', '0271': 'Siegen', '0281': 'Wesel', '0291': 'Meschede',
    '0331': 'Potsdam', '0341': 'Leipzig', '0345': 'Halle', '0351': 'Dresden', '0361': 'Erfurt', '0371': 'Chemnitz',
    '0381': 'Rostock', '0391': 'Magdeburg',
    '0421': 'Bremen', '0431': 'Kiel', '0451': 'Lübeck', '0461': 'Flensburg', '0471': 'Bremerhaven',
    '0511': 'Hannover', '0521': 'Bielefeld', '0531': 'Braunschweig', '0541': 'Osnabrück', '0551': 'Göttingen',
    '0561': 'Kassel', '0571': 'Minden',
    '0611': 'Wiesbaden', '0621': 'Mannheim', '0631': 'Kaiserslautern', '0641': 'Gießen', '0651': 'Trier',
    '0681': 'Saarbrücken',
    '0711': 'Stuttgart', '0721': 'Karlsruhe', '0731': 'Ulm', '0751': 'Ravensburg', '0761': 'Freiburg', '0781': 'Offenburg',
    '0811': 'Hallbergmoos', '0821': 'Augsburg', '0831': 'Kempten', '0841': 'Ingolstadt', '0851': 'Passau', '0871': 'Landshut',
    '0911': 'Nürnberg', '0921': 'Bayreuth', '0931': 'Würzburg', '0941': 'Regensburg', '0951': 'Bamberg', '0981': 'Ansbach',
};

const COUNTRY_CODES: Record<string, string> = {
    '1': 'USA / Canada', '7': 'Russia / Kazakhstan',
    '30': 'Greece', '31': 'Netherlands', '32': 'Belgium', '33': 'France', '34': 'Spain', '36': 'Hungary',
    '39': 'Italy', '40': 'Romania', '41': 'Switzerland', '43': 'Austria', '44': 'United Kingdom', '45': 'Denmark',
    '46': 'Sweden', '47': 'Norway', '48': 'Poland', '49': 'Germany',
    '55': 'Brazil', '61': 'Australia', '81': 'Japan', '86': 'China', '90': 'Türkiye', '91': 'India',
    '351': 'Portugal', '352': 'Luxembourg', '353': 'Ireland', '358': 'Finland', '420': 'Czechia', '421': 'Slovakia',
};

const longestPrefix = (value: string, table: Record<string, string>): string | undefined =>
    Object.keys(table).filter((k) => value.startsWith(k)).sort((a, b) => b.length - a.length)[0];

const toNational = (raw: string): { national?: string; countryCode?: string } => {
    let n = (raw || '').replace(/\D/g, '');
    if (n.startsWith('00')) n = n.slice(2); // 00 international prefix → bare country code
    if (n.startsWith('0')) return { national: n }; // already national (German trunk 0)
    if (n.startsWith('49')) return { national: '0' + n.slice(2) }; // +49 → national
    const cc = longestPrefix(n, COUNTRY_CODES);
    return cc ? { countryCode: cc } : { national: n ? '0' + n : undefined };
};

export const describePhone = (raw: string): PhoneInfo | undefined => {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length < 3) return undefined;

    const { national, countryCode } = toNational(raw);

    if (countryCode) {
        return { icon: 'public', label: COUNTRY_CODES[countryCode], detail: `International · +${countryCode}` };
    }
    if (!national) return undefined;

    if (/^01[5-7]/.test(national)) return { icon: 'smartphone', label: 'Mobile', detail: `Germany · ${national.slice(0, 4)}` };
    if (national.startsWith('0800')) return { icon: 'call', label: 'Toll-free', detail: 'Germany · 0800' };
    if (/^0(900|137|138)/.test(national)) return { icon: 'warning', label: 'Premium rate', detail: `Germany · ${national.slice(0, 4)}`, warn: true };
    if (national.startsWith('0180')) return { icon: 'call', label: 'Shared-cost', detail: 'Germany · 0180' };
    if (national.startsWith('0700')) return { icon: 'call', label: 'Personal number', detail: 'Germany · 0700' };
    if (national.startsWith('032')) return { icon: 'call', label: 'National (non-geographic)', detail: 'Germany · 032' };

    const area = longestPrefix(national, DE_AREA_CODES);
    if (area) return { icon: 'location_on', label: DE_AREA_CODES[area], detail: `Landline · ${area}` };
    return { icon: 'call', label: 'Landline', detail: `Germany · ${national.slice(0, 5)}` };
};

export const phoneLookups = (raw: string): { label: string; icon: string; url: string }[] => {
    const digits = (raw || '').replace(/\D/g, '');
    const { national } = toNational(raw);
    const q = national ?? digits;
    return [
        { label: 'tellows', icon: 'shield', url: `https://www.tellows.de/num/${q}` },
        { label: 'cleverdialer', icon: 'reviews', url: `https://www.cleverdialer.de/nummer/${q}` },
        { label: 'Das Örtliche', icon: 'contact_page', url: `https://www.dasoertliche.de/rueckwaertssuche/?ph=${encodeURIComponent(q)}` },
        { label: 'Google', icon: 'search', url: `https://www.google.com/search?q=${encodeURIComponent('"' + q + '"')}` },
    ];
};
