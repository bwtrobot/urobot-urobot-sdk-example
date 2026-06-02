import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const adapter = adapterRef.current;

    if (!host) {
      return;
    }

    setViewerError(null);
    setViewerReady(false);

    try {
      adapter.mount(host);
      setViewerReady(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '3D viewer unavailable';
      setViewerError(message);
    }

    return () => {
      adapter.dispose();
      setViewerReady(false);
    };
  }, []);

  useEffect(() => {
    if (!viewerReady) return;
    adapterRef.current.loadEdition(edition);
  }, [edition, viewerReady]);

  useEffect(() => {
    if (!viewerReady) return;
    adapterRef.current.updateRobotRuntime(runtime);
  }, [runtime, viewerReady]);

  useEffect(() => {
    if (!viewerReady) return;
    adapterRef.current.setNavigationData(navPaths, topoPaths);
  }, [navPaths, topoPaths, viewerReady]);

  useEffect(() => {
    if (!viewerReady) return;
    adapterRef.current.setLayerVisibility(layers);
  }, [layers, viewerReady]);

  useEffect(() => {
    if (!viewerReady) return;
    adapterRef.current.setRenderSettings(renderSettings);
  }, [renderSettings, viewerReady]);

  return (
    <section className="spatial-viewer" aria-label="Spatial viewer">
      <div ref={hostRef} className="spatial-canvas-host" />
      {viewerError ? (
        <div className="spatial-viewer-fallback" role="status">
          3D 视图不可用：{viewerError}
        </div>
      ) : null}

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
