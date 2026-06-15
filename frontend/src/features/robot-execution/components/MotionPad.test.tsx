import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MotionPad } from './MotionPad';

describe('MotionPad', () => {
  it('sends forward command', async () => {
    const onMove = vi.fn();
    render(<MotionPad onMove={onMove} onRotate={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '前进' }));

    expect(onMove).toHaveBeenCalledWith('forward');
  });

  it('sends rotate command from center control', async () => {
    const onRotate = vi.fn();
    render(<MotionPad onMove={vi.fn()} onRotate={onRotate} />);

    await userEvent.click(screen.getByRole('button', { name: '拖动旋转' }));

    expect(onRotate).toHaveBeenCalledWith(0.4);
  });
});
