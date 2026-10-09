import { describe, expect, it } from 'vitest';
import { attachmentMime, batchReportSchema, batchSchema, base64Size, flowStepSchema, itemSchema, MAX_ATTACHMENTS_PER_ITEM, STYLE_PROPERTIES, MAX_STYLE_CHANGES } from '../src/index.js';
import { makeBatch, makeAttachment, makeElementItem, makeFileItem, makeStyleEditItem } from './fixtures.js';

describe('batchSchema', () => {
  it('accepts a valid batch', () => {
    expect(batchSchema.safeParse(makeBatch()).success).toBe(true);
  });

  it('drops unknown fields instead of failing', () => {
    const parsed = batchSchema.parse({ ...makeBatch(), extra: 'x', items: [{ ...makeElementItem(), extra: 1 }] });
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed.items[0]).not.toHaveProperty('extra');
  });

  it('refuses 0 and 51 items', () => {
    expect(batchSchema.safeParse(makeBatch({ items: [] })).success).toBe(false);
    const many = Array.from({ length: 51 }, (_, i) => makeElementItem(`item-${i}`));
    expect(batchSchema.safeParse(makeBatch({ items: many })).success).toBe(false);
  });

  it('refuses duplicate item ids', () => {
    expect(batchSchema.safeParse(makeBatch({ items: [makeElementItem('a'), makeElementItem('a')] })).success).toBe(false);
  });

  it('refuses ids that could escape a directory', () => {
    expect(batchSchema.safeParse(makeBatch({ id: '../evil' })).success).toBe(false);
  });

  it('refuses a wrong schema tag', () => {
    expect(batchSchema.safeParse({ ...makeBatch(), schema: 'auto-agent.batch/2' }).success).toBe(false);
  });
});

describe('itemSchema', () => {
  it('requires an anchor for element items', () => {
    const { anchor: _anchor, ...noAnchor } = makeElementItem();
    expect(itemSchema.safeParse(noAnchor).success).toBe(false);
  });

  it('requires textEdit for text-edit items', () => {
    expect(itemSchema.safeParse({ ...makeElementItem(), kind: 'text-edit' }).success).toBe(false);
    expect(
      itemSchema.safeParse({ ...makeElementItem(), kind: 'text-edit', textEdit: { before: 'Buy', after: 'Buy now' } }).success,
    ).toBe(true);
  });

  it('requires flow for flow items', () => {
    const { anchor: _a, ...base } = makeElementItem();
    expect(itemSchema.safeParse({ ...base, kind: 'flow' }).success).toBe(false);
  });

  it('refuses an empty comment', () => {
    expect(itemSchema.safeParse({ ...makeElementItem(), comment: '  ' }).success).toBe(false);
  });

  it('refuses a screenshot that is not base64', () => {
    const item = makeElementItem();
    expect(itemSchema.safeParse({ ...item, screenshot: { ...item.screenshot, data: 'not base64!' } }).success).toBe(false);
  });
});

describe('flowStepSchema', () => {
  it('accepts a navigate step with its base fields', () => {
    const step = { id: 's1', at: '2026-10-02T10:00:00Z', path: '/', type: 'navigate', url: 'http://localhost:5173/', cause: 'load' };
    expect(flowStepSchema.parse(step)).toEqual(step);
  });

  it('refuses an unknown step type', () => {
    expect(flowStepSchema.safeParse({ id: 's1', at: 'x', path: '/', type: 'teleport' }).success).toBe(false);
  });
});

describe('batchReportSchema', () => {
  it('caps the summary at 600 characters', () => {
    const report = { outcome: 'done', summary: 'x'.repeat(601), changedFiles: [], items: [] };
    expect(batchReportSchema.safeParse(report).success).toBe(false);
  });
});

describe('attachments', () => {
  it('accepts a file item and files on an element item', () => {
    expect(itemSchema.safeParse(makeFileItem()).success).toBe(true);
    expect(itemSchema.safeParse({ ...makeElementItem(), attachments: [makeAttachment()] }).success).toBe(true);
  });

  it('requires at least one file on a file item', () => {
    expect(itemSchema.safeParse(makeFileItem('f', [])).success).toBe(false);
    const { attachments: _a, ...none } = makeFileItem();
    expect(itemSchema.safeParse(none).success).toBe(false);
  });

  it('refuses more than five files on one item', () => {
    const six = Array.from({ length: MAX_ATTACHMENTS_PER_ITEM + 1 }, (_, i) => makeAttachment({ id: `a${i}` }));
    expect(itemSchema.safeParse(makeFileItem('f', six)).success).toBe(false);
  });

  it('refuses a name whose type does not match the MIME and accepts a case-insensitive match', () => {
    const exe = makeAttachment({ name: 'x.exe', mime: 'application/pdf' });
    expect(itemSchema.safeParse(makeFileItem('f', [exe])).success).toBe(false);
    const pdf = makeAttachment({ name: 'REPORT.PDF', mime: 'application/pdf' });
    expect(itemSchema.safeParse(makeFileItem('f', [pdf])).success).toBe(true);
  });

  it('refuses a size that does not match the data, a MIME outside the list and an empty file', () => {
    expect(itemSchema.safeParse(makeFileItem('f', [makeAttachment({ size: 6 })])).success).toBe(false);
    expect(itemSchema.safeParse(makeFileItem('f', [makeAttachment({ mime: 'application/x-msdownload' })])).success).toBe(false);
    expect(itemSchema.safeParse(makeFileItem('f', [makeAttachment({ data: '', size: 0 })])).success).toBe(false);
  });

  it('refuses a batch whose files pass 10 MB in total', () => {
    // Two 6 MB files: each is allowed, together they are not.
    const six = 'A'.repeat(8 * 1024 * 1024); // 8 Mi base64 chars = 6 MiB
    const big = (id: string) => makeAttachment({ id, name: `${id}.txt`, mime: 'text/plain', size: base64Size(six), data: six });
    const batch = makeBatch({ items: [makeFileItem('f1', [big('a')]), makeFileItem('f2', [big('b')])] });
    const result = batchSchema.safeParse(batch);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toContain('10 MB');
  });

  it('maps a file name to the allow-list MIME, ignoring case', () => {
    expect(attachmentMime('REPORT.PDF')).toBe('application/pdf');
    expect(attachmentMime('data.csv')).toBe('text/csv');
    expect(attachmentMime('java_error_in_studio_955.log')).toBe('text/plain');
    expect(attachmentMime('Screen Shot.PNG')).toBe('image/png');
    expect(attachmentMime('photo.jpg')).toBe('image/jpeg');
    expect(attachmentMime('icon.svg')).toBeUndefined();
    expect(attachmentMime('setup.exe')).toBeUndefined();
    expect(attachmentMime('README')).toBeUndefined();
  });

  it('measures decoded base64', () => {
    expect(base64Size('aGVsbG8=')).toBe(5);
    expect(base64Size('aGVsbG8h')).toBe(6);
  });
});

describe('style-edit items', () => {
  it('accepts a valid style-edit item', () => {
    expect(itemSchema.safeParse(makeStyleEditItem()).success).toBe(true);
  });

  it('requires styleEdit and an anchor', () => {
    const { styleEdit: _se, ...noEdit } = makeStyleEditItem();
    expect(itemSchema.safeParse(noEdit).success).toBe(false);
    const { anchor: _a, ...noAnchor } = makeStyleEditItem();
    expect(itemSchema.safeParse(noAnchor).success).toBe(false);
  });

  it('requires a component name for component scope, not for instance scope', () => {
    const item = makeStyleEditItem();
    const source = { ...item.anchor!.source, component: undefined, componentChain: undefined };
    const anchor = { ...item.anchor!, source };
    expect(itemSchema.safeParse({ ...item, anchor }).success).toBe(false);
    expect(itemSchema.safeParse({ ...item, anchor, styleEdit: { ...item.styleEdit!, scope: 'instance', instanceCount: 1 } }).success).toBe(true);
  });

  it('refuses unknown properties, zero changes and too many changes', () => {
    const item = makeStyleEditItem();
    const change = item.styleEdit!.changes[0]!;
    const withChanges = (changes: unknown[]) => ({ ...item, styleEdit: { ...item.styleEdit!, changes } });
    expect(itemSchema.safeParse(withChanges([{ ...change, property: 'behavior' }])).success).toBe(false);
    expect(itemSchema.safeParse(withChanges([])).success).toBe(false);
    expect(itemSchema.safeParse(withChanges(Array.from({ length: MAX_STYLE_CHANGES + 1 }, () => change))).success).toBe(false);
  });

  it('lists every inspector property once', () => {
    expect(new Set(STYLE_PROPERTIES).size).toBe(STYLE_PROPERTIES.length);
    expect(STYLE_PROPERTIES).toContain('border-top-left-radius');
    expect(STYLE_PROPERTIES).toHaveLength(38);
  });
});
