package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.interfaces.response.RobotResponse;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.robot.model.ListRobotsRequest;
import com.bwton.utwin.opensdk.services.robot.model.ListRobotsResponse;
import com.bwton.utwin.opensdk.services.robot.model.RobotItem;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;
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
                })
                .map(response -> {
                    List<RobotItem> list = response.data();
                    Page<RobotResponse> page = new Page<>();
                    page.setPageNo(response.pageNum());
                    page.setPageSize(response.pageSize());
                    page.setRows(list.stream()
                            .map(RobotResponse::from)
                            .collect(Collectors.toList()));
                    page.setTotalCount(Math.toIntExact(response.total()));
                    page.setTotalPage(Math.toIntExact(response.total() / response.pageSize()));
                    return page;
                });
    }
}
