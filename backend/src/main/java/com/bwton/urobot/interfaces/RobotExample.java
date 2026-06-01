package com.bwton.urobot.interfaces;

import com.bwton.utwin.opensdk.core.auth.AccessKeyCredentials;
import com.bwton.utwin.opensdk.core.auth.CredentialsProvider;
import com.bwton.utwin.opensdk.services.UTwinClient;
import com.bwton.utwin.opensdk.services.robot.model.ListRobotsRequest;
import com.bwton.utwin.opensdk.services.robot.model.ListRobotsResponse;

public class RobotExample {
    public static void main(String[] args) {

        CredentialsProvider provider = () -> AccessKeyCredentials
                .of("MCao0k1GBcdyh4MaWfZL", "wBLnrY4UKerLPTr5tYYeTUh8kej1OM");

        UTwinClient uTwinClient = UTwinClient.builder()
                .credentialsProvider(provider)
                .endpoint("https://dev-utwin.bwton-console.cn")
                .build();

        ListRobotsRequest request = ListRobotsRequest.builder()
                .name("测试人脸")
                .build();
        ListRobotsResponse response= uTwinClient.robot().listRobots(request);
        System.out.println(response.data().size());

    }

   // private
}