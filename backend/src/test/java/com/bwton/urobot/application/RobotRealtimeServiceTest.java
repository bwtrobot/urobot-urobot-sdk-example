package com.bwton.urobot.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bwtrobot.opensdk.core.auth.AccessKeyCredentials;
import io.github.bwtrobot.opensdk.services.URobotClient;
import io.github.bwtrobot.opensdk.ws.config.WsConfiguration;
import io.github.bwtrobot.opensdk.ws.realtime.RobotRealtimeClient;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotSame;

class RobotRealtimeServiceTest {

    @Test
    void realtimeClientRecreatesSdkCachedInstanceAfterClose() throws Exception {
        URobotClient client = testClient();
        RobotRealtimeService service = new RobotRealtimeService(client, new ObjectMapper());
        RobotRealtimeClient closedClient = client.robot().realtime("robot-1");
        closedClient.close();

        RobotRealtimeClient recreatedClient = service.realtimeClient("robot-1");

        assertNotSame(closedClient, recreatedClient);
        assertDoesNotThrow(() -> recreatedClient.onConnected(() -> {
        }));
    }

    private URobotClient testClient() {
        return URobotClient.builder()
                .endpoint("http://localhost")
                .credentialsProvider(() -> AccessKeyCredentials.of("access-key", "secret-key"))
                .wsConfiguration(WsConfiguration.builder().build())
                .build();
    }
}
