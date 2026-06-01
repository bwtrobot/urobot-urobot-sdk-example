package com.bwton.urobot.infrastructure.config;

import com.bwton.utwin.opensdk.core.auth.AccessKeyCredentials;
import com.bwton.utwin.opensdk.core.auth.CredentialsProvider;
import com.bwton.utwin.opensdk.services.UTwinClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class URobotConfiguration {

    @Bean
    public UTwinClient uTwinClient() {

        CredentialsProvider provider = () -> AccessKeyCredentials
                .of("MCao0k1GBcdyh4MaWfZL", "wBLnrY4UKerLPTr5tYYeTUh8kej1OM");
        UTwinClient uTwinClient = UTwinClient.builder()
                .credentialsProvider(provider)
                .endpoint("https://dev.bwton.cn/cps-dev01")
                .build();

        return uTwinClient;
    }
}
