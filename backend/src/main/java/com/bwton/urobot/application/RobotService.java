package com.bwton.urobot.application;

import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.robot.model.ListRobotsRequest;
import com.bwton.utwin.opensdk.services.robot.model.ListRobotsResponse;
import com.bwton.utwin.opensdk.services.robot.model.RobotItem;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
public class RobotService {
    private final UTwinClient uTwinClient;

    public RobotService(UTwinClient uTwinClient) {
        this.uTwinClient = uTwinClient;
    }

    public Mono<Page<?>> page(PageQuery query) {
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
                    Page<RobotItem> page = new Page<>();
                    page.setPageNo(response.pageNum());
                    page.setPageSize(response.pageSize());
                    page.setRows(list);
                    page.setTotalCount(Math.toIntExact(response.total()));
                    page.setTotalPage(Math.toIntExact(response.total() / response.pageSize()));
                    return page;
                });
    }
}
