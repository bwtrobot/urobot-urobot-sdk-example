package com.bwton.urobot.application;

import com.bwton.urobot.interfaces.request.ControlNarrationBody;
import io.github.bwtrobot.opensdk.services.robot.model.ControlNarrationRequest;
import io.github.bwtrobot.opensdk.services.robot.model.GetNarrationRuntimeRequest;
import io.github.bwtrobot.opensdk.services.robot.model.NarrationSegment;
import io.github.bwtrobot.opensdk.services.robot.model.SegmentMode;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RobotServiceTest {
    private final RobotService service = new RobotService(null);

    @Test
    void parseSegmentModeAcceptsBlankAndCaseInsensitiveValues() {
        assertNull(service.parseSegmentMode(null));
        assertNull(service.parseSegmentMode("  "));
        assertEquals(SegmentMode.COLLAPSED, service.parseSegmentMode("collapsed"));
        assertEquals(SegmentMode.EXPANDED, service.parseSegmentMode("Expanded"));
    }

    @Test
    void parseSegmentModeRejectsUnknownValues() {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service.parseSegmentMode("EXPAND"));

        assertEquals("segmentMode 仅支持 collapsed 或 expanded", error.getMessage());
    }

    @Test
    void buildGetNarrationRuntimeRequestSkipsBlankSegmentMode() {
        GetNarrationRuntimeRequest request = service.buildGetNarrationRuntimeRequest("robot-1", " ");

        assertEquals("robot-1", request.robotId());
        assertNull(request.segmentMode());
    }

    @Test
    void buildGetNarrationRuntimeRequestSetsParsedSegmentMode() {
        GetNarrationRuntimeRequest request = service.buildGetNarrationRuntimeRequest("robot-1", "expanded");

        assertEquals(SegmentMode.EXPANDED, request.segmentMode());
    }

    @Test
    void buildControlNarrationRequestKeepsSegmentModeOutOfBody() {
        ControlNarrationRequest request = service.buildControlNarrationRequest(
                "robot-1",
                controlBody(),
                "COLLAPSED");

        assertEquals(SegmentMode.COLLAPSED, request.segmentMode());
        assertFalse(request.toBody().containsKey("segment_mode"));
        assertFalse(request.toBody().containsKey("segmentMode"));
    }

    @Test
    void narrationSegmentToMapIncludesSelfIndexAndLowercaseSegmentType() throws Exception {
        NarrationSegment segment = new NarrationSegment(
                1,
                "node-inspection",
                "巡检点",
                "self",
                null,
                null,
                "task-self-1",
                "executing");
        Method setter = NarrationSegment.class.getDeclaredMethod("setSelfIndex", Integer.class);
        setter.setAccessible(true);
        setter.invoke(segment, 1);

        Map<String, Object> map = service.narrationSegmentToMap(segment);

        assertEquals("self", map.get("segmentType"));
        assertEquals(1, map.get("selfIndex"));
        assertEquals("executing", map.get("taskStatus"));
    }

    private ControlNarrationBody controlBody() {
        ControlNarrationBody body = new ControlNarrationBody();
        body.setEditionId("edition-1");
        body.setProcessId("process-1");
        body.setProcessName("讲解流程");
        body.setCommand("start");
        body.setOperationSource("web-example");
        return body;
    }
}
