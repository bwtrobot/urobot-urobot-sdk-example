package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import io.github.bwtrobot.opensdk.services.URobotClient;
import io.github.bwtrobot.opensdk.services.map.model.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MapService {
    private final URobotClient uRobotClient;

    public MapService(URobotClient uRobotClient) {
        this.uRobotClient = uRobotClient;
    }

    public Mono<List<Map<String, Object>>> listEditions(String mapId) {
        return Mono.fromSupplier(() -> {
            ListMapEditionsRequest req = ListMapEditionsRequest.builder()
                    .mapId(mapId).build();
            List<MapEdition> editions = uRobotClient.map(). listEditions(req).data();
            return editions.stream().map(this::editionToMap).collect(Collectors.toList());
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<List<Map<String, Object>>> getEdition(String editionId) {
        return Mono.fromSupplier(() -> {
            GetMapEditionRequest req = GetMapEditionRequest.builder()
                    .editionId(editionId).build();
            MapEdition edition = uRobotClient.map().getEdition(req).edition();
            return Collections.singletonList(editionToMap(edition));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<List<Map<String, Object>>> getChargingStations(String editionId) {
        return Mono.fromSupplier(() -> {
            GetChargingStationsRequest req = GetChargingStationsRequest.builder()
                    .editionId(editionId).build();
            List<MapPoint> points = uRobotClient.map().getChargingStations(req).data();
            return points.stream().map(this::pointToMap).collect(Collectors.toList());
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Page<Map<String, Object>>> listNavPaths(String editionId, PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListNavPathsRequest req = ListNavPathsRequest.builder()
                    .editionId(editionId)
                    .pageNum(query.getPageNo())
                    .pageSize(query.getPageSize())
                    .build();
            ListNavPathsResponse resp = uRobotClient.map().navPath().list(req);

            // 顺序调用 SDK 获取路径 ID，避免 parallelStream 占用 ForkJoinPool 公共线程池
            List<String> ids = resp.data().stream().map(item -> {
                GetNavPathByUuidResponse edition = uRobotClient.map().navPath().getByUuid(
                        GetNavPathByUuidRequest.builder()
                                .uuid(item.uuid())
                                .editionId(editionId)
                                .build());
                return edition.navPath() != null ? edition.navPath().id() : null;
            }).filter(Objects::nonNull).collect(Collectors.toList());

            List<Map<String, Object>> rows = ids.isEmpty()
                    ? Collections.emptyList()
                    : uRobotClient.map().navPath().listPoints(ListNavPathPointsRequest.builder().ids(ids).build())
                    .data().stream()
                    .filter(Objects::nonNull)
                    .map(this::navPathDetailToMap)
                    .collect(Collectors.toList());

            Page<Map<String, Object>> page = new Page<>();
            page.setRows(rows);
            page.setTotalCount(resp.total().intValue());
            page.setPageNo(resp.pageNum());
            page.setPageSize(resp.pageSize());
            page.setTotalPage((int) Math.ceil((double) resp.total() / resp.pageSize()));
            return page;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Page<Map<String, Object>>> listTopoPaths(String editionId, PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListTopoPathsRequest req = ListTopoPathsRequest.builder()
                    .editionId(editionId)
                    .pageNum(query.getPageNo())
                    .pageSize(query.getPageSize())
                    .build();
            ListTopoPathsResponse resp = uRobotClient.map().topoPath().list(req);

            // 顺序调用 SDK 获取路径 ID，避免 parallelStream 占用 ForkJoinPool 公共线程池
            List<String> ids = resp.data().stream().map(item -> {
                GetTopoPathByUuidResponse edition = uRobotClient.map().topoPath().getByUuid(
                        GetTopoPathByUuidRequest.builder()
                                .uuid(item.uuid())
                                .editionId(editionId)
                                .build());
                return edition.topoPath() != null ? edition.topoPath().id() : null;
            }).filter(Objects::nonNull).collect(Collectors.toList());

            List<Map<String, Object>> rows = ids.isEmpty()
                    ? Collections.emptyList()
                    : uRobotClient.map().topoPath().listPoints(ListTopoPathPointsRequest.builder().ids(ids).build())
                    .data().stream()
                    .filter(Objects::nonNull)
                    .map(this::topoPathDetailToMap)
                    .collect(Collectors.toList());

            Page<Map<String, Object>> page = new Page<>();
            page.setRows(rows);
            page.setTotalCount(resp.total().intValue());
            page.setPageNo(resp.pageNum());
            page.setPageSize(resp.pageSize());
            page.setTotalPage((int) Math.ceil((double) resp.total() / resp.pageSize()));
            return page;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<List<Map<String, Object>>> listNarrationProcesses(String editionId) {
        return Mono.fromSupplier(() -> {
            ListNarrationProcessesRequest req = ListNarrationProcessesRequest.builder()
                    .editionId(editionId)
                    .build();
            List<NarrationProcess> processes = uRobotClient.map().narration().listProcesses(req).data();
            if (processes == null) {
                return Collections.<Map<String, Object>>emptyList();
            }
            return processes.stream().map(this::narrationProcessToMap).collect(Collectors.toList());
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Map<String, Object>> getNarrationProcessDetail(String editionId, String processId) {
        return Mono.fromSupplier(() -> {
            GetNarrationProcessDetailRequest req = GetNarrationProcessDetailRequest.builder()
                    .editionId(editionId)
                    .processId(processId)
                    .build();
            NarrationProcess process = uRobotClient.map().narration().getProcessDetail(req).process();
            return process == null ? Collections.<String, Object>emptyMap() : narrationProcessToMap(process);
        }).subscribeOn(Schedulers.boundedElastic());
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
        m.put("coordinateFrame", "THREE");
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
        m.put("coordinateFrame", "THREE");
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

    private Map<String, Object> narrationProcessToMap(NarrationProcess process) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", process.id());
        m.put("uuid", process.uuid() == null ? null : process.uuid().toString());
        m.put("name", process.name());
        m.put("navPathId", process.navPathId());
        m.put("navPathName", process.navPathName());
        m.put("valid", process.valid());
        m.put("nodes", process.nodes() == null
                ? Collections.emptyList()
                : process.nodes().stream().map(this::narrationProcessNodeToMap).collect(Collectors.toList()));
        return m;
    }

    private Map<String, Object> narrationProcessNodeToMap(NarrationProcessNode node) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", node.id());
        m.put("uuid", node.uuid() == null ? null : node.uuid().toString());
        m.put("name", node.name());
        m.put("navNodeId", node.navNodeId());
        m.put("order", node.order());
        m.put("position", node.position());
        m.put("rotation", node.rotation());
        // SDK 对 selfScripts、selfScriptNames、selfScriptValids 三个列表各自独立降级，不保证等长。
        m.put("selfScripts", node.selfScripts());
        m.put("selfScriptNames", node.selfScriptNames());
        m.put("selfScriptValids", node.selfScriptValids());
        m.put("stopover", node.stopover());
        return m;
    }
}
