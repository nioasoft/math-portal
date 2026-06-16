import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ModePicker } from '../ModePicker';

const messages = { games3d: { modes: { practice: 'תרגול', practiceDesc: 'תרגול חופשי', quiz: 'חידון', quizDesc: 'אתגר עם ניקוד', choose: 'בחר מצב' } } };

function renderPicker(modes: Array<'practice' | 'quiz'>, onPick = vi.fn()) {
  render(
    <NextIntlClientProvider locale="he" messages={messages}>
      <ModePicker supportedModes={modes} onPick={onPick} />
    </NextIntlClientProvider>
  );
  return onPick;
}

describe('ModePicker', () => {
  it('renders a button per supported mode', () => {
    renderPicker(['practice', 'quiz']);
    expect(screen.getByRole('button', { name: /תרגול/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /חידון/ })).toBeInTheDocument();
  });

  it('calls onPick with the chosen mode', () => {
    const onPick = renderPicker(['practice', 'quiz']);
    fireEvent.click(screen.getByRole('button', { name: /חידון/ }));
    expect(onPick).toHaveBeenCalledWith('quiz');
  });
});
