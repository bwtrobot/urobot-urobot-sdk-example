package com.bwton.urobot.interfaces.api;

import com.bwton.urobot.infrastructure.lang.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import reactor.core.publisher.Mono;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public Mono<Result<Object>> handleException(Exception e) {
        log.error("请求处理异常", e);
        Result<Object> result = new Result<>(false, "INTERNAL_ERROR", e.getMessage());
        return Mono.just(result);
    }
}