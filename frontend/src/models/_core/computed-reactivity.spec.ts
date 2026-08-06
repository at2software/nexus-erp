import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * A model computed that reads only plain instance fields tracks no signal, so it caches its first
 * value for the lifetime of the instance - it never recomputes after patch(), after a LiveSync
 * refetch or after reload(). Nothing throws and nothing looks wrong in the template; the value is
 * simply frozen at whatever it was when first read.
 *
 * The convention is an explicit `this.snapshot()` touch to establish the dependency, as in
 * `Serializable.getName`:
 *
 *     readonly getName = computed(() => { this.snapshot(); return this.name ?? '' });
 *
 * This guard parses the model sources into a call graph of class members, marks everything that
 * reaches `snapshot()` directly or transitively, and fails on any computed left unmarked.
 *
 * It is a source check rather than a runtime one on purpose: enumerating models through
 * `import.meta.glob` loads them outside the Angular compiler, which yields a second copy of every
 * module and breaks `instanceof` against the specs' own imports.
 */

const MODELS_DIR = join(process.cwd(), 'src', 'models');
const BACKSLASH = String.fromCharCode(92);
const TOUCHES_SNAPSHOT = /\bsnapshot\s*\(|\bsnapshotAsThis\s*\(/;

// Computeds whose value cannot change over an instance's lifetime, so a frozen value is correct.
const CONSTANT = new Set([
    'Company.acceptedChildren',
    'LeadSource.getAvatar',
    'Project.acceptedChildren',
    'Serializable.css',
]);

interface Member {
    name: string;
    body: string;
    line: number;
    isComputed: boolean;
    reactive: boolean;
}

const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name))
            : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [join(dir, e.name)] : [],
    );

function matchingClose(src: string, from: number, open: string, close: string): number {
    let depth = 0, inStr: string | null = null, prev = '';
    for (let j = from; j < src.length; j++) {
        const c = src[j];
        if (inStr) { if (c === inStr && prev !== BACKSLASH) inStr = null; }
        else if (c === '"' || c === "'" || c === '`') inStr = c;
        else if (c === open) depth++;
        else if (c === close) { depth--; if (depth === 0) return j + 1; }
        prev = c;
    }
    return src.length;
}

const lineAt = (src: string, i: number) => src.slice(0, i).split('\n').length;

function parse(file: string) {
    const src = readFileSync(file, 'utf8');
    const members = new Map<string, Member>();
    const add = (name: string, body: string, line: number, isComputed: boolean, reactive = false) => {
        const existing = members.get(name);
        if (existing) { existing.body += '\n' + body; existing.reactive ||= reactive; return; }
        members.set(name, { name, body, line, isComputed, reactive });
    };

    for (const m of src.matchAll(/(?:readonly\s+)?(#?[A-Za-z0-9_$]+)\s*[:=][^=\n]*?\b(signal|linkedSignal|toSignal|input)\s*[(<]/g)) {
        add(m[1], m[0], lineAt(src, m.index ?? 0), false, true);
    }

    // Class members declared as methods, getters, or arrow-function fields.
    for (const m of src.matchAll(/^\s{4}(?:(?:public|private|protected|override|static|readonly|async|get|set)\s+)*(#?[A-Za-z0-9_$]+)\s*(?:\([^)]*\)\s*(?::[^{=]+)?\{|=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>)/gm)) {
        const start = m.index ?? 0;
        const isBlock = m[0].trimEnd().endsWith('{');
        const brace = src.indexOf('{', start + m[0].length - 1);
        const body = isBlock
            ? src.slice(start, matchingClose(src, brace, '{', '}'))
            : src.slice(start, src.indexOf('\n', start));
        add(m[1], body, lineAt(src, start), false, TOUCHES_SNAPSHOT.test(body));
    }

    let i = 0;
    while ((i = src.indexOf('computed(', i)) !== -1) {
        if (/[A-Za-z0-9_$.]/.test(src.slice(Math.max(0, i - 1), i))) { i += 9; continue; }
        const end = matchingClose(src, i + 8, '(', ')');
        const line = lineAt(src, i);
        const decl = src.slice(src.lastIndexOf('\n', i) + 1, i).trim();
        const name = decl.match(/(#?[A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*$/)?.[1] ?? `<anonymous@${line}>`;
        const body = src.slice(i, end);
        members.set(name, { name, body, line, isComputed: true, reactive: TOUCHES_SNAPSHOT.test(body) });
        i = end;
    }

    return { file, src, members };
}

const classNameAt = (src: string, line: number): string => {
    const upto = src.split('\n').slice(0, line).join('\n');
    const matches = [...upto.matchAll(/export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/g)];
    return matches.at(-1)?.[1] ?? '?';
};

describe('model computeds establish a reactive dependency', () => {
    it('has no computed that freezes on first read', () => {
        const parsed = walk(MODELS_DIR).map(parse);
        const allComputeds = parsed.flatMap((p) => [...p.members.values()].filter((m) => m.isComputed));
        expect(allComputeds.length).toBeGreaterThan(100);

        for (let changed = true; changed;) {
            changed = false;
            for (const { members } of parsed) {
                for (const member of members.values()) {
                    if (member.reactive) continue;
                    // Any `.name(` call, not just `this.name(`: reactivity often arrives through a
                    // delegate, as in VcardClass's `this.getPersonal()?.card()`. A name only counts
                    // when the same class declares it, so unrelated `.map(`/`.join(` never match.
                    for (const call of member.body.matchAll(/(?:this\.(#?[A-Za-z0-9_$]+)\b|\.\s*(#?[A-Za-z0-9_$]+)\s*\()/g)) {
                        const name = call[1] ?? call[2];
                        const dep = members.get(name);
                        if (dep && dep !== member && dep.reactive) { member.reactive = true; changed = true; break; }
                    }
                }
            }
        }

        const frozen = parsed.flatMap(({ file, src, members }) =>
            [...members.values()]
                .filter((m) => m.isComputed && !m.reactive && /\bthis\./.test(m.body))
                .map((m) => ({
                    id: `${classNameAt(src, m.line)}.${m.name}`,
                    at: `${file.split(/[\\/]/).slice(-2).join('/')}:${m.line}`,
                })),
        ).filter((c) => !CONSTANT.has(c.id));

        expect(frozen.map((f) => `${f.id}  (${f.at})`)).toEqual([]);
    });
});
