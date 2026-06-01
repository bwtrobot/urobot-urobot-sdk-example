import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LayerDropdown, type LayerVisibility } from './LayerDropdown';

describe('LayerDropdown', () => {
  const visibleLayers: LayerVisibility = {
    bim: true,
    globalPointCloud: true,
    groundPointCloud: true,
    paths: true,
  };

  it('renders layer rows and toggles a layer through onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LayerDropdown layers={visibleLayers} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '图层' }));

    expect(screen.getByRole('menuitemcheckbox', { name: /BIM 模型/ })).toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: /全局点云/ })).toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: /地面点云/ })).toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: /导航点 \/ 路径/ })).toBeChecked();
    expect(screen.getAllByLabelText('可见')).toHaveLength(4);

    await user.click(screen.getByRole('menuitemcheckbox', { name: /地面点云/ }));

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

    expect(screen.getByRole('menuitemcheckbox', { name: /BIM 模型/ })).not.toBeChecked();
    expect(screen.getByLabelText('隐藏')).toBeInTheDocument();
  });
});
