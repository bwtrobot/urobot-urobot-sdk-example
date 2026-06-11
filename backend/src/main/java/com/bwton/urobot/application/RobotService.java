package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.interfaces.request.SendCommandBody;
import com.bwton.urobot.interfaces.response.RobotResponse;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.robot.model.*;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RobotService {
    private final UTwinClient uTwinClient;
    private final RobotRealtimeService realtimeService;

    public RobotService(UTwinClient uTwinClient, RobotRealtimeService realtimeService) {
        this.uTwinClient = uTwinClient;
        this.realtimeService = realtimeService;
    }

    public Mono<Page<RobotResponse>> page(PageQuery query) {
        return Mono.fromSupplier(() -> {
            ListRobotsRequest request = ListRobotsRequest.builder()
                    .pageSize(query.getPageSize())
                    .pageNum(query.getPageNo())
                    .build();
            ListRobotsResponse listRobotsResponse = uTwinClient.robot().listRobots(request);
            return listRobotsResponse;
        }).map(response -> {
            List<RobotItem> list = response.data();
            Page<RobotResponse> page = new Page<>();
            page.setPageNo(response.pageNum());
            page.setPageSize(response.pageSize());
            page.setRows(list.stream()
                    .map(RobotResponse::from)
                    .collect(Collectors.toList()));
            page.setTotalCount(Math.toIntExact(response.total()));
            page.setTotalPage((int) Math.ceil((double) response.total() / response.pageSize()));
            return page;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Map<String, Object>> getRobotRuntime(String robotId) {
        return Mono.fromSupplier(() -> {
            GetRobotRuntimeRequest request = GetRobotRuntimeRequest.builder()
                    .robotId(robotId)
                    .build();
            return uTwinClient.robot().getRobotRuntime(request).runtime();
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<String> sendCommand(String robotId, SendCommandBody body) {
        return Mono.fromSupplier(() -> {
            Map<String, Object> params = normalizeCommandParams(body.getParams());
            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("type", body.getType());
            requestBody.put("messagesType", normalizeMessagesType(body.getMessagesType()));
            requestBody.put("params", params);
            if (body.getCallbackUrl() != null && !body.getCallbackUrl().trim().isEmpty()) {
                requestBody.put("callbackUrl", body.getCallbackUrl());
            }

            SendCommandResponse response = uTwinClient.httpClient().post(
                    "/robot/command/" + robotId,
                    Collections.emptyMap(),
                    requestBody,
                    SendCommandResponse.class,
                    uTwinClient.tokenManager(),
                    uTwinClient.retryPolicy());
            String taskId = response.taskId();
            // 指令仍走现有 HTTP 直传路径；若实时通道已连接，手动注册 taskId 以接入 TASK_REPLY 推送。
            realtimeService.registerTask(robotId, taskId);
            return taskId;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private String normalizeMessagesType(String messagesType) {
        if (messagesType == null || messagesType.trim().isEmpty()) {
            return "task_submit";
        }
        return messagesType;
    }

    private Map<String, Object> normalizeCommandParams(Map<String, Object> rawParams) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (rawParams != null) {
            params.putAll(rawParams);
        }

        Object taskId = params.get("task_id");
        if (taskId == null || String.valueOf(taskId).trim().isEmpty()) {
            taskId = params.remove("taskId");
        }
        if (taskId == null || String.valueOf(taskId).trim().isEmpty()) {
            taskId = UUID.randomUUID().toString();
        }
        params.put("task_id", taskId);

        return params;
    }

    public Mono<List<Map<String, Object>>> getTaskResult(String robotId, List<String> taskIds) {
        return Mono.fromSupplier(() -> {
            GetTaskResultRequest request = GetTaskResultRequest.builder()
                    .robotId(robotId)
                    .taskIds(taskIds)
                    .build();
            List<TaskReply> replies = uTwinClient.robot().getTaskResult(request).data();
            return replies.stream().map(this::taskReplyToMap).collect(Collectors.toList());
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private Map<String, Object> taskReplyToMap(TaskReply reply) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("task_id", reply.taskId());
        map.put("task_status", reply.taskStatus());
        map.put("messages_type", reply.messagesType());
        if (reply.commandRespList() != null) {
            map.put("command_resp_list", reply.commandRespList().stream().map(cmd -> {
                Map<String, Object> cmdMap = new LinkedHashMap<>();
                cmdMap.put("status", cmd.status());
                cmdMap.put("result", cmd.result());
                cmdMap.put("description", cmd.description());
                cmdMap.put("task_command_code", cmd.taskCommandCode());
                cmdMap.put("task_command_id", cmd.taskCommandId());
                return cmdMap;
            }).collect(Collectors.toList()));
        }
        return map;
    }
}
