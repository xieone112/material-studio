package com.example.studio.controller;

import com.example.studio.service.SimulationManager;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 开发调试接口：运行时调整模拟器的失败阶段与各阶段耗时，
 * 便于演示“指定阶段失败”和不同处理时长。仅用于开发/演示环境。
 */
@RestController
@RequestMapping("/api/dev/simulation")
public class DevSimulationController {

    private static final Set<String> VALID_STAGES =
            Set.of("NONE", "MATERIAL_CHECK", "SIMULATED_GENERATE", "RESULT_ORGANIZE");

    private final SimulationManager simulation;

    public DevSimulationController(SimulationManager simulation) {
        this.simulation = simulation;
    }

    @GetMapping
    public Map<String, Object> get() {
        return toDto();
    }

    @PutMapping
    public Map<String, Object> update(@RequestBody UpdateRequest request) {
        if (request.failStage != null) {
            String stage = request.failStage.toUpperCase();
            if (!VALID_STAGES.contains(stage)) {
                throw new com.example.studio.common.ApiException(400, "无效的失败阶段: " + request.failStage);
            }
            simulation.setFailStage(stage);
        }
        if (request.failReason != null) {
            simulation.setFailReason(request.failReason);
        }
        if (request.materialCheckMs != null && request.materialCheckMs >= 0) {
            simulation.setMaterialCheckMs(request.materialCheckMs);
        }
        if (request.simulatedGenerateMs != null && request.simulatedGenerateMs >= 0) {
            simulation.setSimulatedGenerateMs(request.simulatedGenerateMs);
        }
        if (request.resultOrganizeMs != null && request.resultOrganizeMs >= 0) {
            simulation.setResultOrganizeMs(request.resultOrganizeMs);
        }
        return toDto();
    }

    private Map<String, Object> toDto() {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("failStage", simulation.getFailStage());
        dto.put("failReason", simulation.getFailReason());
        dto.put("materialCheckMs", simulation.getMaterialCheckMs());
        dto.put("simulatedGenerateMs", simulation.getSimulatedGenerateMs());
        dto.put("resultOrganizeMs", simulation.getResultOrganizeMs());
        return dto;
    }

    public static class UpdateRequest {
        public String failStage;
        public String failReason;
        public Long materialCheckMs;
        public Long simulatedGenerateMs;
        public Long resultOrganizeMs;
    }
}
