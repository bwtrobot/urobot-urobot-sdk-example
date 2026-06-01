import { useEffect, useRef, type ReactNode } from 'react';
import type {
  MapEdition,
  NavigationPath,
  RobotRuntime,
  TopologyPath,
} from '../../../shared/types/api';
import { createSpatialScene, type RenderSettings } from '../lib/spatialScene';
import { LayerDropdown, type LayerVisibility } from './LayerDropdown';
import { RenderDropdown } from './RenderDropdown';
import './spatial-viewer.css';

interface SpatialViewerProps {
  edition: MapEdition | null;
  runtime: RobotRuntime | null;
  navPaths: NavigationPath[];
  topoPaths: TopologyPath[];
  layers: LayerVisibility;
  renderSettings: RenderSettings;
  onLayersChange: (layers: LayerVisibility) => void;
  onRenderSettingsChange: (settings: RenderSettings) => void;
  motionPad?: ReactNode;
  debugDrawer?: ReactNode;
}

export function SpatialViewer({
  edition,
  runtime,
  navPaths,
  topoPaths,
  layers,
  renderSettings,
  onLayersChange,
  onRenderSettingsChange,
  motionPad,
  debugDrawer,
}: SpatialViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef(createSpatialScene());

  useEffect(() => {
    const host = hostRef.current;
    const adapter = adapterRef.current;

    if (!host) {
      return;
    }

    adapter.mount(host);

    return () => {
      adapter.dispose();
    };
  }, []);

  useEffect(() => {
    adapterRef.current.loadEdition(edition);
  }, [edition]);

  useEffect(() => {
    adapterRef.current.updateRobotRuntime(runtime);
  }, [runtime]);

  useEffect(() => {
    adapterRef.current.setNavigationData(navPaths, topoPaths);
  }, [navPaths, topoPaths]);

  useEffect(() => {
    adapterRef.current.setLayerVisibility(layers);
  }, [layers]);

  useEffect(() => {
    adapterRef.current.setRenderSettings(renderSettings);
  }, [renderSettings]);

  return (
    <section className="spatial-viewer" aria-label="Spatial viewer">
      <div ref={hostRef} className="spatial-canvas-host" />

      <div className="spatial-toolbar" aria-label="Spatial viewer toolbar">
        <LayerDropdown layers={layers} onChange={onLayersChange} />
        <RenderDropdown
          settings={renderSettings}
          onChange={onRenderSettingsChange}
        />
      </div>

      {motionPad ? <div className="spatial-motion-slot">{motionPad}</div> : null}
      {debugDrawer ? <div className="spatial-debug-slot">{debugDrawer}</div> : null}
    </section>
  );
}
