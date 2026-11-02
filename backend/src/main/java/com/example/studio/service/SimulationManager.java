package com.example.studio.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 模拟生成器配置。支持两种控制方式：
 * 1. application.yml / 环境变量设置初始值；
 * 2. 开发调试接口 PUT /api/dev/simulation 运行时调整（仅内存态，重启后恢复配置值）。
 */
@Component
public class SimulationManager {

    @Value("${simulator.material-check-ms:4000}")
    private long materialCheckMs;

    @Value("${simulator.simulated-generate-ms:6000}")
    private long simulatedGenerateMs;

    @Value("${simulator.result-organize-ms:3000}")
    private long resultOrganizeMs;

    @Value("${simulator.fail-stage:NONE}")
    private String failStage;

    @Value("${simulator.fail-reason:模拟执行失败（用于演示失败场景）}")
    private String failReason;

    public long getMaterialCheckMs() { return materialCheckMs; }
    public void setMaterialCheckMs(long v) { this.materialCheckMs = v; }

    public long getSimulatedGenerateMs() { return simulatedGenerateMs; }
    public void setSimulatedGenerateMs(long v) { this.simulatedGenerateMs = v; }

    public long getResultOrganizeMs() { return resultOrganizeMs; }
    public void setResultOrganizeMs(long v) { this.resultOrganizeMs = v; }

    public String getFailStage() { return failStage; }
    public void setFailStage(String stage) { this.failStage = stage == null ? "NONE" : stage; }

    public String getFailReason() { return failReason; }
    public void setFailReason(String reason) { this.failReason = reason; }
}
