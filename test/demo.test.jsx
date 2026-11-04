// @vitest-environment jsdom
import {act} from 'react';
import cssEscape from 'css.escape';
import {screen, waitFor, within} from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';

test('renders the real Select collection and announces five grouped options only on the patched side', async () => {
  // JSDOM does not implement layout observation or scrolling.
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal('CSS', {escape: cssEscape});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { await import('../src/main.jsx'); });

  const user = userEvent.setup();
  const sections = [...document.querySelectorAll('section')];
  expect(sections).toHaveLength(2);
  const [baseline, patched] = sections.map(section => within(section));
  const baselineTrigger = baseline.getByRole('button', {name: /Favorite Animal/});
  const patchedTrigger = patched.getByRole('button', {name: /Favorite Animal/});
  const open = async trigger => {
    await act(async () => { trigger.focus(); await user.keyboard(' '); });
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getByRole('option', {name: 'Cat'})).toBe(document.activeElement);
  };
  const close = async () => {
    await act(async () => { await user.keyboard('{Escape}'); });
  };

  // A healthy baseline must still reproduce the absence of a count announcement.
  await open(baselineTrigger);
  expect(baseline.getByText('(none)')).toBeTruthy();
  expect(document.querySelector('[aria-live="assertive"]')?.textContent ?? '').not.toContain('5 options available.');
  await close();

  await open(patchedTrigger);
  await waitFor(() => expect(document.querySelector('[aria-live="assertive"]')?.textContent).toContain('5 options available.'));
  expect(patched.getAllByText('5 options available.')).toHaveLength(1);
  // Focus changes must not append duplicate announcements.
  await act(async () => { await user.keyboard('{ArrowDown}'); });
  expect(patched.getAllByText('5 options available.')).toHaveLength(1);
  await close();
  await open(patchedTrigger);
  expect(patched.getAllByText('5 options available.')).toHaveLength(2);
  await close();

  // Non-Apple devices with a focused option must retain native behavior.
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux x86_64');
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64)');
  await open(patchedTrigger);
  expect(patched.getAllByText('5 options available.')).toHaveLength(2);
  await close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
