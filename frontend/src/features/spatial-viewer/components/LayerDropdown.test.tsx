import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LayerDropdown, type LayerVisibility } from './LayerDropdown';

describe('LayerDropdown', () => {
  const visibleLayers: LayerVisibility = {
    bim: true,
    globalPointCloud: true,
    groundPointCloud: true,
    realtimePointCloud: true,
    paths: true,
  };

  it('renders layer rows and toggles a layer through onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LayerDropdown layers={visibleLayers} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '图层' }));

    expect(screen.getByRole('button', { name: /BIM 模型/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /全局点云/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /地面点云/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /实时点云/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /导航点 \/ 路径/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByLabelText('可见')).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: /地面点云/ }));

    expect(onChange).toHaveBeenCalledWith({
      ...visibleLayers,
      groundPointCloud: false,
    });
  });

  it('shows hidden state with an eye-off icon', async () => {
    const user = userEvent.setup();

    render(
      <LayerDropdown
        layers={{ ...visibleLayers, bim: false }}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '图层' }));

    expect(screen.getByRole('button', { name: /BIM 模型/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('隐藏')).toBeInTheDocument();
  });
});
