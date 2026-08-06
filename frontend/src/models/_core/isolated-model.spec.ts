import { computed } from '@angular/core';
import { Serializable } from '@models/_core/serializable';
import { Type } from '@models/_core/hydrate';
import type { NxAction } from '@models/_core/nx.actions';

class Widget extends Serializable {
    static override API_PATH(): string { return 'widgets' }
    override class = 'Widget';
    label: string = '';
    name: string = '';
    size: number = 0;

    fromSnapshot = computed(() => this.snapshot().label as string);
    fromField = computed(() => { this.snapshot(); return this.label });
}

class WidgetBox extends Serializable {
    static override API_PATH(): string { return 'widget-boxes' }
    override class = 'WidgetBox';
    @Type(() => Widget) widget!: Widget;
    @Type(() => Widget) widgets: Widget[] = [];
}

class Gadget extends Serializable {
    static override API_PATH(): string { return 'gadgets' }
    override class = 'Gadget';
    builds = 0;

    protected override buildActions(): NxAction[] {
        this.builds++;
        return [{ title: 'open' }];
    }
}

describe('a model without the nx bridge', () => {
    it('constructs', () => {
        const w = new Widget();
        expect(w.label).toBe('');
        expect(w.track_id).toBeGreaterThan(0);
    });

    it('deserializes scalars', () => {
        const w = Widget.fromJson({ id: '3', label: 'left', size: 12 });
        expect(w).toBeInstanceOf(Widget);
        expect(w.label).toBe('left');
        expect(w.size).toBe(12);
    });

    it('deserializes nested models and arrays', () => {
        const box = WidgetBox.fromJson({
            id: '1',
            widget: { id: '2', label: 'solo' },
            widgets: [{ id: '3', label: 'a' }, { id: '4', label: 'b' }],
        });

        expect(box.widget).toBeInstanceOf(Widget);
        expect(box.widget.label).toBe('solo');
        expect(box.widgets.map((_) => _.label)).toEqual(['a', 'b']);
    });

    it('reports a fresh model as clean', () => {
        expect(Widget.fromJson({ id: '3', label: 'left' }).isDirty()).toBe(false);
    });

    it('exposes the raw payload through snapshot()', () => {
        expect(Widget.fromJson({ id: '3', label: 'left' }).snapshot().label).toBe('left');
    });

    it('clones', () => {
        const w = Widget.fromJson({ id: '3', label: 'left', var: { tags: ['a'] } });
        const clone = w.getClone<Widget>();

        expect(clone.label).toBe('left');
        expect(clone.var['tags']).not.toBe(w.var['tags']);
    });
});

describe('patch()', () => {
    it('writes the patched values into the snapshot', () => {
        const w = Widget.fromJson({ id: '3', label: 'left', size: 12 });
        w.patch({ label: 'right' });

        expect(w.snapshot().label).toBe('right');
        expect(w.snapshot().size).toBe(12);
    });

    it('refreshes a computed that reads the snapshot payload', () => {
        const w = Widget.fromJson({ id: '3', label: 'left' });
        expect(w.fromSnapshot()).toBe('left');

        w.patch({ label: 'right' });
        expect(w.fromSnapshot()).toBe('right');
    });

    it('refreshes a computed that touches the snapshot and reads the field', () => {
        const w = Widget.fromJson({ id: '3', label: 'left' });
        expect(w.fromField()).toBe('left');

        w.patch({ label: 'right' });
        expect(w.fromField()).toBe('right');
    });

    it('still invalidates when patched with nothing, for callers that mutated the model directly', () => {
        const w = Widget.fromJson({ id: '3', label: 'left' });
        expect(w.fromField()).toBe('left');

        w.label = 'right';
        w.patch({});
        expect(w.fromField()).toBe('right');
    });
});

describe('a cloned model', () => {
    it('resolves its own url, not the original\'s', () => {
        const w = Widget.fromJson({ id: '3', label: 'left' });
        const clone = w.getClone<Widget>();
        clone.id = '9';

        expect(clone.apiPathWithId()).toBe('widgets/9');
        expect(w.apiPathWithId()).toBe('widgets/3');
    });

    it('reads its own fields through field-declared helpers', () => {
        const w = Widget.fromJson({ id: '3', name: 'left' });
        const clone = w.getClone<Widget>();
        clone.name = 'right';

        expect(clone.getName()).toBe('right');
        expect(w.getName()).toBe('left');
    });

    it('carries its own private state', () => {
        const w = Widget.fromJson({ id: '3', label: 'left' });
        const clone = w.getClone<Widget>();

        expect(clone.snapshot().label).toBe('left');
        expect(clone.isDirty()).toBe(false);
    });
});

describe('context-menu actions', () => {
    it('are not built while the model is only deserialized', () => {
        expect(Gadget.fromJson({ id: '1' }).builds).toBe(0);
    });

    it('are built once, on first read', () => {
        const g = Gadget.fromJson({ id: '1' });

        expect(g.actions.map((_) => _.title)).toEqual(['open']);
        expect(g.actions.map((_) => _.title)).toEqual(['open']);
        expect(g.builds).toBe(1);
    });

    it('keep in-place mutations made after the first read', () => {
        const g = Gadget.fromJson({ id: '1' });
        g.actions.push({ title: 'extra' });

        expect(g.actions.map((_) => _.title)).toEqual(['open', 'extra']);
        expect(g.builds).toBe(1);
    });

    it('can be replaced wholesale without ever building the defaults', () => {
        const g = Gadget.fromJson({ id: '1' });
        g.actions = [{ title: 'only' }];

        expect(g.actions.map((_) => _.title)).toEqual(['only']);
        expect(g.builds).toBe(0);
    });

    it('are rebuilt for a clone rather than shared with the original', () => {
        const g = Gadget.fromJson({ id: '1' });
        g.actions.push({ title: 'extra' });

        expect(g.getClone<Gadget>().actions.map((_) => _.title)).toEqual(['open']);
    });
});
