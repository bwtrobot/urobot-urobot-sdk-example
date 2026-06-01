package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.application.RobotService;
import com.bwton.urobot.infrastructure.lang.Page;
import com.bwton.urobot.infrastructure.lang.PageQuery;
import com.bwton.urobot.infrastructure.lang.Result;
import com.bwton.urobot.interfaces.response.RobotResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("robot")
public class BaseHanlder {
    private final RobotService service;

    public BaseHanlder(RobotService service) {
        this.service = service;
    }

    @GetMapping(value = "page")
    public Mono<Result<Page<RobotResponse>>> page(@ModelAttribute PageQuery pageQuery) {
        return service.page(pageQuery)
                .map(page -> {
                    Result<Page<RobotResponse>> result = new Result<>();
                    result.setResult(page);
                    return result;
                });
    }
}
