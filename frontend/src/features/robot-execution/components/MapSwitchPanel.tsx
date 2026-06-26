import { useEffect, useMemo, useState } from 'react';
import type { MapEdition, MapItem } from '../../../shared/types/api';
import './robot-execution.css';

interface MapSwitchPanelProps {
  maps: MapItem[];
  /** 每张地图对应的版本列表，key 为 mapId */
  editionsMap: Record<string, MapEdition[]>;
  /** 当前激活的地图版本 ID */
  currentEditionId?: string;
  /** 切换中的 editionId，用于禁用按钮 */
  switchingEditionId?: string;
  onSwitch: (editionId: string) => void;
}

export function MapSwitchPanel({
  maps,
  editionsMap,
  currentEditionId,
  switchingEditionId,
  onSwitch,
}: MapSwitchPanelProps) {
  // 每张地图独立维护用户选中的版本
  const [selectedEditions, setSelectedEditions] = useState<Record<string, string>>({});
  const mapsKey = useMemo(() => maps.map((map) => map.id).join('|'), [maps]);
  const editionsKey = useMemo(
    () =>
      Object.entries(editionsMap)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([mapId, editions]) => `${mapId}:${editions.map((edition) => edition.id).join(',')}`)
        .join('|'),
    [editionsMap],
  );

  useEffect(() => {
    setSelectedEditions({});
  }, [mapsKey, editionsKey]);

  function getSelectedEditionId(mapId: string): string {
    if (selectedEditions[mapId]) return selectedEditions[mapId];
    const editions = editionsMap[mapId] ?? [];
    // 优先选中当前激活版本，否则选第一条
    const current = editions.find((e) => e.id === currentEditionId);
    return current?.id ?? editions[0]?.id ?? '';
  }

  if (maps.length === 0) {
    return (
      <section className="side-card">
        <h2>地图切换</h2>
        <p className="muted">暂无可用地图</p>
      </section>
    );
  }

  return (
    <section className="side-card">
      <h2>地图切换</h2>
      <div className="map-switch-scroll">
      <table className="map-switch-table">
        <thead>
          <tr>
            <th>地图</th>
            <th>版本</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {maps.map((map) => {
            const editions = editionsMap[map.id] ?? [];
            const selectedId = getSelectedEditionId(map.id);
            const isCurrent = editions.some((e) => e.id === currentEditionId);
            const isSwitching = switchingEditionId === selectedId;

            return (
              <tr key={map.id}>
                <td>
                  <span className="map-name-cell">
                    {map.name}
                    {isCurrent && <em className="current-badge">当前</em>}
                  </span>
                </td>
                <td>
                  {editions.length > 0 ? (
                    <select
                      aria-label={`${map.name}版本`}
                      value={selectedId}
                      onChange={(e) =>
                        setSelectedEditions((prev) => ({ ...prev, [map.id]: e.target.value }))
                      }
                    >
                      {editions.map((edition) => (
                        <option key={edition.id} value={edition.id}>
                          {edition.name}
                          {edition.id === currentEditionId ? ' (当前)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">加载中...</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="map-switch-btn"
                    disabled={!selectedId || selectedId === currentEditionId || isSwitching}
                    onClick={() => onSwitch(selectedId)}
                  >
                    {isSwitching ? '切换中...' : '切换'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
