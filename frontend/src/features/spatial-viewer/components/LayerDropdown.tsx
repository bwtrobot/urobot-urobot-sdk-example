import { Eye, EyeOff, Layers } from 'lucide-react';
import { useState } from 'react';

export interface LayerVisibility {
  bim: boolean;
  globalPointCloud: boolean;
  groundPointCloud: boolean;
  realtimePointCloud: boolean;
  paths: boolean;
}

interface LayerDropdownProps {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
}

const layerRows: Array<{
  key: keyof LayerVisibility;
  label: string;
}> = [
  { key: 'bim', label: 'BIM 模型' },
  { key: 'globalPointCloud', label: '全局点云' },
  { key: 'groundPointCloud', label: '地面点云' },
  { key: 'realtimePointCloud', label: '实时点云' },
  { key: 'paths', label: '导航点 / 路径' },
];

export function LayerDropdown({ layers, onChange }: LayerDropdownProps) {
  const [open, setOpen] = useState(false);

  const toggleLayer = (key: keyof LayerVisibility) => {
    onChange({
      ...layers,
      [key]: !layers[key],
    });
  };

  return (
    <div className="spatial-dropdown">
      <button
        type="button"
        className="spatial-toolbar-button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={16} aria-hidden="true" />
        图层
      </button>

      {open ? (
        <div className="spatial-dropdown-panel">
          {layerRows.map((row) => {
            const visible = layers[row.key];
            const Icon = visible ? Eye : EyeOff;

            return (
              <button
                key={row.key}
                type="button"
                className="spatial-menu-row"
                aria-pressed={visible}
                onClick={() => toggleLayer(row.key)}
              >
                <span>{row.label}</span>
                <Icon size={16} aria-label={visible ? '可见' : '隐藏'} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
