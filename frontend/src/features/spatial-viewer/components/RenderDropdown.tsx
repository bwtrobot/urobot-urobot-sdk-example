import { Box, Check, CircleDot } from 'lucide-react';
import { useState } from 'react';
import type { RenderSettings } from '../lib/spatialScene';

interface RenderDropdownProps {
  settings: RenderSettings;
  onChange: (settings: RenderSettings) => void;
}

const pointSizeOptions: Array<{
  value: RenderSettings['pointSize'];
  label: string;
}> = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

const opacityOptions: Array<{
  value: RenderSettings['opacity'];
  label: string;
}> = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'solid', label: '实' },
];

export function RenderDropdown({ settings, onChange }: RenderDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="spatial-dropdown">
      <button
        type="button"
        className="spatial-toolbar-button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <CircleDot size={16} aria-hidden="true" />
        渲染
      </button>

      {open ? (
        <div className="spatial-dropdown-panel spatial-render-panel" role="menu">
          <div className="spatial-control-group">
            <span className="spatial-control-label">点大小</span>
            <div className="spatial-segmented" role="group" aria-label="点大小">
              {pointSizeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    settings.pointSize === option.value
                      ? 'spatial-segment is-active'
                      : 'spatial-segment'
                  }
                  aria-pressed={settings.pointSize === option.value}
                  onClick={() => onChange({ ...settings, pointSize: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="spatial-control-group">
            <span className="spatial-control-label">透明度</span>
            <div className="spatial-segmented" role="group" aria-label="透明度">
              {opacityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    settings.opacity === option.value
                      ? 'spatial-segment is-active'
                      : 'spatial-segment'
                  }
                  aria-pressed={settings.opacity === option.value}
                  onClick={() => onChange({ ...settings, opacity: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="spatial-menu-row"
            role="menuitemcheckbox"
            aria-checked={settings.bimWireframe}
            onClick={() =>
              onChange({ ...settings, bimWireframe: !settings.bimWireframe })
            }
          >
            <span>BIM 线框</span>
            {settings.bimWireframe ? (
              <Check size={16} aria-label="启用" />
            ) : (
              <Box size={16} aria-label="关闭" />
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
