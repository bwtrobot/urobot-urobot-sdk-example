# Frontend Spatial Workbench Design

## Goal

Build the `frontend` application as an SDK companion Web example for the robot execution experience.
The first release is a single-robot spatial workbench, not a device-management console.
It must demonstrate reusable architecture for later robot guide and robot fire-inspection business pages.

## Scope

In scope:

- React + Vite + TypeScript frontend architecture
- Single-robot spatial workbench as the first screen
- Backend integration with automatic Mock fallback
- 3D scene rendering with SoonSpaceJS
- BIM rendering
- static point cloud rendering for map `globalMap` and `groundMap`
- robot pose overlay from runtime telemetry
- navigation points, navigation paths, and topology paths visualization
- execution controls for navigation, voice, charging, pause/resume, and emergency stop
- left-bottom motion pad for forward/back/left/right plus drag-rotate interaction
- top-right dropdowns for layer visibility and rendering settings
- collapsible API debug panel

Out of scope for this release:

- robot guide workflow orchestration page
- robot fire-inspection workflow orchestration page
- multi-robot dispatch console
- realtime point cloud subscription
- authentication UI
- advanced analytics or historical dashboards

## Architecture

Use a layered structure:

- `src/app`: app bootstrap, routing, global layout
- `src/pages/workbench`: the spatial workbench page
- `src/features/robot-execution`: robot selection, robot status, command controls, navigation target selection, task timeline
- `src/features/spatial-viewer`: SoonSpaceJS scene wrapper, BIM, PCD, path layers, robot pose rendering
- `src/services/api`: backend client, request logging, response normalization, Mock fallback
- `src/services/mock`: mock datasets and mock task state
- `src/shared`: shared UI, utilities, and types

This separation keeps the spatial renderer isolated from execution logic and keeps both reusable for later business pages.

## Core Components

- `SpatialWorkbenchPage`: page shell that composes viewer, controls, and debug surface
- `SpatialViewer`: owns scene lifecycle, object registration, camera/state operations
- `LayerDropdown`: controls visibility of BIM, global point cloud, ground point cloud, and navigation layers
- `RenderDropdown`: controls point size, transparency, and BIM wireframe-like render options
- `MotionPad`: left-bottom control for basic movement and drag rotation
- `RobotStatusCard`: online state, battery, control mode, pose summary
- `NavigationTargetPanel`: point, path, and topology target selection
- `CommandPanel`: command buttons for execution actions
- `TaskTimeline`: task id, task state, and command response list
- `ApiDebugDrawer`: request/response/error log and Mock fallback reason

## Data Flow

1. Load robot list from `GET /robot/page`.
2. Select the first robot by default, or keep the last user choice if available.
3. Poll `GET /robot/runtime/{robot}` every 3 seconds.
4. Update 3D robot pose from `ros_odom.pose`.
5. Load map version data including `bim.fileUrl`, `globalMap`, `groundMap`, and path datasets.
6. Render BIM, point cloud, paths, and robot pose in the viewer.
7. Send commands through `POST /robot/command/{robot}`.
8. Track command state through `GET /robot/task-result/{robot}`.
9. Log all requests and failures in the debug drawer.
10. If backend call fails or endpoint is unavailable, return Mock data and mark the UI as demo mode.

## Error Handling

- Backend success: render real data and log request/response.
- Backend failure or missing endpoint: auto-fallback to Mock, show demo state, and record the reason.
- Command failure: keep the task as failed, do not silently mark it successful.
- BIM/PCD load failure: keep the scene alive and expose per-layer retry or error state.
- Telemetry timeout: preserve last pose and show stale telemetry state.
- Critical actions such as emergency stop and charging use loading/disabled states to prevent duplicate sends.

## Testing

- Unit tests for API client, Mock fallback, payload building, and pose conversion helpers
- Component tests for dropdown state, motion pad interaction, and debug drawer behavior
- Integration checks for workbench rendering, robot loading, and graceful fallback behavior
- Browser verification for a non-empty 3D canvas and visible layer separation

## Product Notes

The first release should read like an SDK example, not a platform.
The main visual priority is the spatial scene, while execution controls remain immediately accessible.
Later guide and fire-inspection pages should reuse the same execution and spatial layers, not duplicate them.

