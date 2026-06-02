package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.map.model.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MapService {
    private final UTwinClient uTwinClient;

    public MapService(UTwinClient uTwinClient) {
        this.uTwinClient = uTwinClient;
    }

    public Mono<List<Map<String, Object>>> listEditions(String mapId) {
        return Mono.fromSupplier(() -> {
            ListMapEditionsRequest req = ListMapEditionsRequest.builder()
                    .mapId(mapId).build();
            List<MapEdition> editions = uTwinClient.map().listEditions(req).data();
            return editions.stream().map(this::editionToMap).collect(Collectors.toList());
        });
    }

    public Mono<List<Map<String, Object>>> getEdition(String editionId) {
        return Mono.fromSupplier(() -> {
            GetMapEditionRequest req = GetMapEditionRequest.builder()
                    .editionId(editionId).build();
            MapEdition edition = uTwinClient.map().getEdition(req).edition();
            return Collections.singletonList(editionToMap(edition));
        });
    }

    public Mono<List<Map<String, Object>>> getChargingStations(String editionId) {
        return Mono.fromSupplier(() -> {
            GetChargingStationsRequest req = GetChargingStationsRequest.builder()
                    .editionId(editionId).build();
            List<MapPoint> points = uTwinClient.map().getChargingStations(req).data();
            return points.stream().map(this::pointToMap).collect(Collectors.toList());
        });
    }

    public Mono<Page<Map<String, Object>>> listNavPaths(String editionId, PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListNavPathsRequest req = ListNavPathsRequest.builder()
                    .editionId(editionId)
                    .pageNum(query.getPageNo())
                    .pageSize(query.getPageSize())
                    .build();
            ListNavPathsResponse resp = uTwinClient.map().navPath().list(req);

            List<Map<String, Object>> rows = resp.data().stream().map(item -> {
                GetNavPathPointsResponse detail = uTwinClient.map().navPath().getPoints(
                        GetNavPathPointsRequest.builder().id(item.uuid()).build());
                return navPathDetailToMap(detail.detail());
            }).collect(Collectors.toList());

            Page<Map<String, Object>> page = new Page<>();
            page.setRows(rows);
            page.setTotalCount(resp.total().intValue());
            page.setPageNo(resp.pageNum());
            page.setPageSize(resp.pageSize());
            page.setTotalPage((int) Math.ceil((double) resp.total() / resp.pageSize()));
            return page;
        });
    }

    public Mono<Page<Map<String, Object>>> listTopoPaths(String editionId, PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListTopoPathsRequest req = ListTopoPathsRequest.builder()
                    .editionId(editionId)
                    .pageNum(query.getPageNo())
                    .pageSize(query.getPageSize())
                    .build();
            ListTopoPathsResponse resp = uTwinClient.map().topoPath().list(req);

            List<Map<String, Object>> rows = resp.data().stream().map(item -> {
                GetTopoPathPointsResponse detail = uTwinClient.map().topoPath().getPoints(
                        GetTopoPathPointsRequest.builder().id(item.uuid()).build());
                return topoPathDetailToMap(detail.detail());
            }).collect(Collectors.toList());

            Page<Map<String, Object>> page = new Page<>();
            page.setRows(rows);
            page.setTotalCount(resp.total().intValue());
            page.setPageNo(resp.pageNum());
            page.setPageSize(resp.pageSize());
            page.setTotalPage((int) Math.ceil((double) resp.total() / resp.pageSize()));
            return page;
        });
    }

    private Map<String, Object> editionToMap(MapEdition e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.id());
        m.put("mapId", e.mapId());
        m.put("name", e.name());
        m.put("mapName", e.mapName());
        m.put("createTime", e.createTime());
        m.put("globalMap", e.globalMap());
        m.put("groundMap", e.groundMap());
        m.put("bim", e.bim());
        return m;
    }

    private Map<String, Object> pointToMap(MapPoint p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.id());
        m.put("uuid", p.uuid());
        m.put("name", p.name());
        m.put("x", p.x());
        m.put("y", p.y());
        m.put("z", p.z());
        m.put("rotationX", p.rotationX());
        m.put("rotationY", p.rotationY());
        m.put("rotationZ", p.rotationZ());
        m.put("editionId", p.editionId());
        m.put("editionName", p.editionName());
        return m;
    }

    private Map<String, Object> navPathDetailToMap(NavPathDetail d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.id());
        m.put("uuid", d.uuid());
        m.put("name", d.name());
        m.put("mapId", d.mapId());
        m.put("mapName", d.mapName());
        m.put("editionId", d.editionId());
        m.put("editionName", d.editionName());
        if (d.nodes() != null) {
            m.put("nodes", d.nodes().stream().map(n -> {
                Map<String, Object> nm = new LinkedHashMap<>();
                nm.put("id", n.id());
                nm.put("uuid", n.uuid());
                nm.put("name", n.name());
                nm.put("order", n.order());
                nm.put("position", n.position());
                nm.put("orientation", n.orientation());
                return nm;
            }).collect(Collectors.toList()));
        }
        return m;
    }

    private Map<String, Object> topoPathDetailToMap(TopoPathDetail d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.id());
        m.put("uuid", d.uuid());
        m.put("name", d.name());
        m.put("mapId", d.mapId());
        m.put("mapName", d.mapName());
        m.put("editionId", d.editionId());
        m.put("editionName", d.editionName());
        if (d.nodes() != null) {
            m.put("nodes", d.nodes().stream().map(n -> {
                Map<String, Object> nm = new LinkedHashMap<>();
                nm.put("id", n.id());
                nm.put("uuid", n.uuid());
                nm.put("name", n.name());
                nm.put("order", n.order());
                nm.put("position", n.position());
                nm.put("orientation", n.orientation());
                return nm;
            }).collect(Collectors.toList()));
        }
        if (d.edges() != null) {
            m.put("edges", d.edges().stream().map(e -> {
                Map<String, Object> em = new LinkedHashMap<>();
                em.put("id", e.id());
                em.put("snode", e.snode());
                em.put("enode", e.enode());
                em.put("passable", e.passable());
                return em;
            }).collect(Collectors.toList()));
        }
        return m;
    }
}
