package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.MapService;
import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.infrastructure.lang.Result;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("map")
public class MapHandler {
    private final MapService mapService;

    public MapHandler(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping("{mapId}/editions")
    public Mono<Result<List<Map<String, Object>>>> listEditions(@PathVariable String mapId) {
        return mapService.listEditions(mapId).map(Result::ok);
    }

    @GetMapping("edition/{editionId}")
    public Mono<Result<List<Map<String, Object>>>> getEdition(@PathVariable String editionId) {
        return mapService.getEdition(editionId).map(Result::ok);
    }

    @GetMapping("edition/{editionId}/charging-stations")
    public Mono<Result<List<Map<String, Object>>>> chargingStations(@PathVariable String editionId) {
        return mapService.getChargingStations(editionId).map(Result::ok);
    }

    @GetMapping("nav-path/page")
    public Mono<Result<Page<Map<String, Object>>>> navPathPage(
            @RequestParam String editionId,
            @ModelAttribute PageQuery pageQuery) {
        return mapService.listNavPaths(editionId, pageQuery).map(Result::ok);
    }

    @GetMapping("topo-path/page")
    public Mono<Result<Page<Map<String, Object>>>> topoPathPage(
            @RequestParam String editionId,
            @ModelAttribute PageQuery pageQuery) {
        return mapService.listTopoPaths(editionId, pageQuery).map(Result::ok);
    }
}
