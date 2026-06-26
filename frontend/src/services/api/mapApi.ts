import { apiRequest } from './httpClient';
import {
  mockChargingPoints,
  mockEdition,
  mockMaps,
  mockNarrationProcesses,
  mockNavigationPath,
  mockTopologyPath,
} from '../mock/mockData';
import type {
  MapEdition,
  MapItem,
  MapPoint,
  NavigationPath,
  NarrationProcessSummary,
  PageResult,
  TopologyPath,
} from '../../shared/types/api';

function buildPageResult<T>(rows: T[]): PageResult<T> {
  return {
    rows,
    total_count: rows.length,
    page_no: 1,
    page_size: rows.length,
    total_page: rows.length > 0 ? 1 : 0,
  };
}

export async function listRobotMaps(robotId: string) {
  return apiRequest<MapItem[]>({
    method: 'GET',
    url: `/robot/${robotId}/maps`,
    fallbackData: mockMaps,
  });
}

export async function getMapEditions(mapId: string) {
  return apiRequest<MapEdition[]>({
    method: 'GET',
    url: `/map/${mapId}/editions`,
    fallbackData: [mockEdition],
  });
}

export async function getMapEdition(editionId: string) {
  return apiRequest<MapEdition[]>({
    method: 'GET',
    url: `/map/edition/${editionId}`,
    fallbackData: [mockEdition],
  });
}

export async function getChargingPoints(editionId: string) {
  return apiRequest<MapPoint[]>({
    method: 'GET',
    url: `/map/edition/${editionId}/charging-stations`,
    fallbackData: mockChargingPoints,
  });
}

export async function listNavigationPaths(editionId: string) {
  return apiRequest<PageResult<NavigationPath>>({
    method: 'GET',
    url: '/map/nav-path/page',
    params: { editionId, pageNo: 1, pageSize: 20 },
    fallbackData: buildPageResult([mockNavigationPath]),
  });
}

export async function listTopologyPaths(editionId: string) {
  return apiRequest<PageResult<TopologyPath>>({
    method: 'GET',
    url: '/map/topo-path/page',
    params: { editionId, pageNo: 1, pageSize: 20 },
    fallbackData: buildPageResult([mockTopologyPath]),
  });
}

export async function listNarrationProcesses(editionId: string) {
  return apiRequest<NarrationProcessSummary[]>({
    method: 'GET',
    url: `/map/edition/${editionId}/narration-processes`,
    fallbackData: mockNarrationProcesses,
  });
}
