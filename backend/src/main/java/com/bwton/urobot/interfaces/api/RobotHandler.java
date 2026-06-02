package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.RobotService;
import com.bwton.urobot.infrastructure.lang.Result;
import com.bwton.urobot.interfaces.request.SendCommandBody;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("robot")
public class RobotHandler {
    private final RobotService service;

    public RobotHandler(RobotService service) {
        this.service = service;
    }

    @GetMapping("runtime/{robotId}")
    public Mono<Result<Map<String, Object>>> runtime(@PathVariable String robotId) {
        return service.getRobotRuntime(robotId).map(Result::ok);
    }

    @PostMapping("command/{robotId}")
    public Mono<Result<String>> command(@PathVariable String robotId,
                                         @RequestBody SendCommandBody body) {
        return service.sendCommand(robotId, body).map(Result::ok);
    }

    @GetMapping("task-result/{robotId}")
    public Mono<Result<List<Map<String, Object>>>> taskResult(
            @PathVariable String robotId,
            @RequestParam(value = "task_ids", required = false) List<String> taskIds,
            @RequestParam(value = "taskIds", required = false) List<String> legacyTaskIds) {
        List<String> resolvedTaskIds = taskIds != null ? taskIds : legacyTaskIds;
        return service.getTaskResult(robotId, resolvedTaskIds).map(Result::ok);
    }
}
