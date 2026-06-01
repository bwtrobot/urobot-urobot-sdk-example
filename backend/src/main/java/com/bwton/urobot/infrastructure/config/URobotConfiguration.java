package com.bwton.urobot.infrastructure.config;

import com.bwton.utwin.opensdk.core.auth.AccessKeyCredentials;
import com.bwton.utwin.opensdk.core.auth.CredentialsProvider;
import com.bwton.utwin.opensdk.services.UTwinClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class URobotConfiguration {

    @Value("${UTWIN_ACCESS_KEY}")
    private String  accessKey;
    @Value("${UTWIN_SECRET_KEY}")
    private String  secretKey;

    @Bean
    public UTwinClient uTwinClient() {

        CredentialsProvider provider = () -> AccessKeyCredentials.of(accessKey, secretKey);

        UTwinClient uTwinClient = UTwinClient.builder()
                .credentialsProvider(provider)
                .endpoint("https://dev.bwton.cn/cps-dev01")
                .build();

        return uTwinClient;
    }

    public void setAccessKey(String accessKey) {
        this.accessKey = accessKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }
}
