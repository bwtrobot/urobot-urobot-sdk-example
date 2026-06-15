package com.bwton.urobot.infrastructure.config;

import com.bwton.utwin.opensdk.core.auth.AccessKeyCredentials;
import com.bwton.utwin.opensdk.core.auth.CredentialsProvider;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.ws.config.WsConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class URobotConfiguration {

    @Value("${utwin.access-key}")
    private String accessKey;
    @Value("${utwin.secret-key}")
    private String secretKey;
    @Value("${utwin.endpoint}")
    private String endpoint;
    @Value("${utwin.ws.enabled:true}")
    private boolean wsEnabled;
    @Value("${utwin.ws.max-reconnect-attempts:3}")
    private int maxReconnectAttempts;
    @Value("${utwin.ws.reconnect-interval:5s}")
    private Duration reconnectInterval;
    @Value("${utwin.ws.heartbeat-interval:30s}")
    private Duration heartbeatInterval;
    @Value("${utwin.ws.connect-timeout:10s}")
    private Duration connectTimeout;
    @Value("${utwin.ws.task-cache-max-size:1000}")
    private int taskCacheMaxSize;
    @Value("${utwin.ws.task-cache-ttl:1h}")
    private Duration taskCacheTtl;

    @Bean
    public UTwinClient uTwinClient() {
        CredentialsProvider provider = () -> AccessKeyCredentials.of(accessKey, secretKey);
        UTwinClient.Builder builder = UTwinClient.builder()
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
