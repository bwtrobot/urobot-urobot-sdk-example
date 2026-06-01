import { apiRequest } from './httpClient';
import {
  mockChargingPoints,
  mockEdition,
  mockNavigationPath,
  mockTopologyPath,
} from '../mock/mockData';
import type {
  MapEdition,
  MapPoint,
  NavigationPath,
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

export async function getMapEditions(mapId: string) {
  return apiRequest<PageResult<MapEdition>>({
    method: 'GET',
    url: '/map/edition/page',
    params: { mapId },
    fallbackData: buildPageResult([mockEdition]),
  });
}

export async function getMapEdition(editionId: string) {
  return apiRequest<MapEdition>({
    method: 'GET',
    url: `/map/edition/${editionId}`,
    fallbackData: mockEdition,
  });
}

export async function getChargingPoints(editionId: string) {
  return apiRequest<MapPoint[]>({
    method: 'GET',
    url: `/map/edition/${editionId}/charge-point`,
    fallbackData: mockChargingPoints,
  });
}

export async function listNavigationPaths(editionId: string) {
  return apiRequest<PageResult<NavigationPath>>({
    method: 'GET',
    url: `/map/edition/${editionId}/navigation-path/page`,
    fallbackData: buildPageResult([mockNavigationPath]),
  });
}

export async function listTopologyPaths(editionId: string) {
  return apiRequest<PageResult<TopologyPath>>({
    method: 'GET',
    url: `/map/edition/${editionId}/topology-path/page`,
    fallbackData: buildPageResult([mockTopologyPath]),
  });
}
