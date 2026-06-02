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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RobotService {
    private final UTwinClient uTwinClient;

    public RobotService(UTwinClient uTwinClient) {
        this.uTwinClient = uTwinClient;
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
            SendCommandRequest request = SendCommandRequest.builder()
                    .robotId(robotId)
                    .type(body.getType())
                    .messagesType(body.getMessagesType())
                    .params(body.getParams())
                    .callbackUrl(body.getCallbackUrl())
                    .build();
            return uTwinClient.robot().sendCommand(request).taskId();
        }).subscribeOn(Schedulers.boundedElastic());
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
