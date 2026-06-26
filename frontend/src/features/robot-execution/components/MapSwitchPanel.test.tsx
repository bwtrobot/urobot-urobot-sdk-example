import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MapSwitchPanel } from './MapSwitchPanel';
import type { MapEdition, MapItem } from '../../../shared/types/api';

const maps: MapItem[] = [
  { id: 'map-a', name: '地图 A' },
];

const editionsA: MapEdition[] = [
  { id: 'edition-a1', mapId: 'map-a', name: '版本 A1', mapName: '地图 A' },
  { id: 'edition-a2', mapId: 'map-a', name: '版本 A2', mapName: '地图 A' },
];

const editionsB: MapEdition[] = [
  { id: 'edition-b1', mapId: 'map-a', name: '版本 B1', mapName: '地图 A' },
];

describe('MapSwitchPanel', () => {
  it('地图版本列表变化后清理旧的本地选择', async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    const { rerender } = render(
      <MapSwitchPanel
        maps={maps}
        editionsMap={{ 'map-a': editionsA }}
        currentEditionId="edition-a1"
        onSwitch={onSwitch}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox'), 'edition-a2');

    rerender(
      <MapSwitchPanel
        maps={maps}
        editionsMap={{ 'map-a': editionsB }}
        currentEditionId="edition-b1"
        onSwitch={onSwitch}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('edition-b1');
  });
});
