package com.bwton.urobot.infrastructure.config;

import com.bwton.utwin.opensdk.core.auth.AccessKeyCredentials;
import com.bwton.utwin.opensdk.core.auth.CredentialsProvider;
import com.bwton.utwin.opensdk.services.UTwinClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class URobotConfiguration {

    @Value("${utwin.access-key}")
    private String accessKey;
    @Value("${utwin.secret-key}")
    private String secretKey;
    @Value("${utwin.endpoint}")
    private String endpoint;

    @Bean
    public UTwinClient uTwinClient() {
        CredentialsProvider provider = () -> AccessKeyCredentials.of(accessKey, secretKey);
        return UTwinClient.builder()
                .credentialsProvider(provider)
                .endpoint(endpoint)
                .build();
    }

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder.propertyNamingStrategy(
                com.fasterxml.jackson.databind.PropertyNamingStrategies.SNAKE_CASE);
    }
}
