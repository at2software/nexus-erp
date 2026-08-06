import { sanitizeHtml } from '@constants/html/sanitize-html';

/**
 * The point of replacing Angular's sanitizer here is to keep Quill's formatting. That is only
 * acceptable if everything executable still goes, so both halves are pinned.
 */
describe('sanitizeHtml', () => {
    describe('keeps what Quill needs', () => {
        it('inline styles: colour, alignment, indentation', () => {
            expect(sanitizeHtml('<p style="text-align:center;color:#ff0000">hi</p>')).toContain('text-align');
            expect(sanitizeHtml('<p style="text-align:center;color:#ff0000">hi</p>')).toContain('color');
        });

        it('data-list, which Quill\'s CSS uses to draw bullets', () => {
            expect(sanitizeHtml('<ol><li data-list="bullet">a</li></ol>')).toContain('data-list="bullet"');
        });

        it('ql-* classes', () => {
            expect(sanitizeHtml('<p class="ql-align-center ql-indent-1">hi</p>')).toContain('ql-align-center');
        });

        it('links with target', () => {
            const out = sanitizeHtml('<a href="https://example.test" target="_blank">l</a>');
            expect(out).toContain('href="https://example.test"');
            expect(out).toContain('target="_blank"');
        });

        it('ordinary formatting and structure', () => {
            const out = sanitizeHtml('<p><strong>a</strong><em>b</em><u>c</u><br><blockquote>q</blockquote></p>');
            expect(out).toContain('<strong>');
            expect(out).toContain('<em>');
            expect(out).toContain('<blockquote>');
        });
    });

    describe('removes anything executable', () => {
        it('script tags', () => {
            expect(sanitizeHtml('<p>a</p><script>alert(1)</script>')).not.toContain('script');
        });

        it('inline event handlers', () => {
            const out = sanitizeHtml('<img src="x" onerror="alert(1)"><p onclick="alert(1)">a</p>');
            expect(out).not.toContain('onerror');
            expect(out).not.toContain('onclick');
        });

        it('javascript: urls', () => {
            expect(sanitizeHtml('<a href="javascript:alert(1)">l</a>')).not.toContain('javascript:');
        });

        it('iframes and objects', () => {
            const out = sanitizeHtml('<iframe src="https://evil.test"></iframe><object data="x"></object>');
            expect(out).not.toContain('<iframe');
            expect(out).not.toContain('<object');
        });

        it('style elements, which can exfiltrate via selectors', () => {
            expect(sanitizeHtml('<style>body{background:url(https://evil.test)}</style><p>a</p>')).not.toContain('<style');
        });

        it('form controls', () => {
            const out = sanitizeHtml('<form action="https://evil.test"><input name="p"><button>go</button></form>');
            expect(out).not.toContain('<form');
            expect(out).not.toContain('<input');
        });

        it('svg script payloads', () => {
            expect(sanitizeHtml('<svg><script>alert(1)</script></svg>')).not.toContain('alert');
        });
    });

    it('handles empty input', () => {
        expect(sanitizeHtml('')).toBe('');
    });
});
