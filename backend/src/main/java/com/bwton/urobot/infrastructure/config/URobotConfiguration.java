package com.bwton.urobot.infrastructure.config;

import io.github.bwtrobot.opensdk.core.auth.AccessKeyCredentials;
import io.github.bwtrobot.opensdk.core.auth.CredentialsProvider;
import io.github.bwtrobot.opensdk.services.URobotClient;
import io.github.bwtrobot.opensdk.ws.config.WsConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class URobotConfiguration {

    @Value("${urobot.access-key}")
    private String accessKey;
    @Value("${urobot.secret-key}")
    private String secretKey;
    @Value("${urobot.endpoint}")
    private String endpoint;
    @Value("${urobot.ws.enabled:true}")
    private boolean wsEnabled;
    @Value("${urobot.ws.max-reconnect-attempts:3}")
    private int maxReconnectAttempts;
    @Value("${urobot.ws.reconnect-interval:5s}")
    private Duration reconnectInterval;
    @Value("${urobot.ws.heartbeat-interval:30s}")
    private Duration heartbeatInterval;
    @Value("${urobot.ws.connect-timeout:10s}")
    private Duration connectTimeout;
    @Value("${urobot.ws.task-cache-max-size:1000}")
    private int taskCacheMaxSize;
    @Value("${urobot.ws.task-cache-ttl:1h}")
    private Duration taskCacheTtl;

    @Bean
    public URobotClient uRobotClient() {
        CredentialsProvider provider = () -> AccessKeyCredentials.of(accessKey, secretKey);
        URobotClient.Builder builder = URobotClient.builder()
                .credentialsProvider(provider)
                .endpoint(endpoint);

        if (wsEnabled) {
            builder.wsConfiguration(WsConfiguration.builder()
                    .maxReconnectAttempts(maxReconnectAttempts)
                    .reconnectInterval(reconnectInterval)
                    .heartbeatInterval(heartbeatInterval)
                    .connectTimeout(connectTimeout)
                    .taskCacheMaxSize(taskCacheMaxSize)
                    .taskCacheTtl(taskCacheTtl)
                    .build());
        }

        return builder.build();
    }

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder.propertyNamingStrategy(
                com.fasterxml.jackson.databind.PropertyNamingStrategies.SNAKE_CASE);
    }
}
