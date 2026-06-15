import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RenderSettings } from '../lib/spatialScene';
import { RenderDropdown } from './RenderDropdown';

describe('RenderDropdown', () => {
  const settings: RenderSettings = {
    pointSize: 'medium',
    opacity: 'solid',
    bimWireframe: false,
  };

  it('updates point size, opacity, and BIM wireframe settings', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RenderDropdown settings={settings} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '渲染' }));
    await user.click(screen.getByRole('button', { name: '大' }));
    await user.click(screen.getByRole('button', { name: '低' }));
    await user.click(screen.getByRole('button', { name: /BIM 线框/ }));

    expect(onChange).toHaveBeenNthCalledWith(1, {
      ...settings,
      pointSize: 'large',
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      ...settings,
      opacity: 'low',
    });
    expect(onChange).toHaveBeenNthCalledWith(3, {
      ...settings,
      bimWireframe: true,
    });
  });
});
