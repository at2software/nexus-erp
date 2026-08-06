import type Quill from 'quill';

export function insertCurrentDate(quill: Quill) {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const range = quill.getSelection() ?? { index: quill.getLength(), length: 0 };
    quill.insertText(range.index, dateStr, 'user');
    quill.setSelection(range.index + dateStr.length, 0);
}
