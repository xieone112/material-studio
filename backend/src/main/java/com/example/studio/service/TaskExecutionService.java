package com.example.studio.service;

import com.example.studio.mapper.AssetMapper;
import com.example.studio.mapper.TaskMapper;
import com.example.studio.mapper.TemplateMapper;
import com.example.studio.model.Asset;
import com.example.studio.model.TaskEntity;
import com.example.studio.model.Template;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 后台异步任务执行器：按“素材检查 → 模拟生成 → 结果整理”三个步骤顺序执行。
 *
 * 设计要点：
 * - 任务提交接口只创建 PENDING 记录并投递到线程池，不等待执行完成；
 * - 每一步开始前先更新 current_stage + status，执行结果持久化到 MySQL；
 * - 任一步失败即停止后续步骤，写入 failure_stage 与 failure_reason；
 * - delay() 的耗时来自 SimulationManager，可配置、可运行时调整。
 */
@Service
public class TaskExecutionService {

    private static final Logger log = LoggerFactory.getLogger(TaskExecutionService.class);

    private final TaskMapper taskMapper;
    private final TemplateMapper templateMapper;
    private final AssetMapper assetMapper;
    private final StorageService storageService;
    private final SimulationManager simulation;

    public TaskExecutionService(TaskMapper taskMapper,
                                TemplateMapper templateMapper,
                                AssetMapper assetMapper,
                                StorageService storageService,
                                SimulationManager simulation) {
        this.taskMapper = taskMapper;
        this.templateMapper = templateMapper;
        this.assetMapper = assetMapper;
        this.storageService = storageService;
        this.simulation = simulation;
    }

    /** 提交到线程池的入口：只接收 taskNo，执行时重新从数据库读取任务。 */
    public void run(String taskNo) {
        TaskEntity task = taskMapper.selectByNo(taskNo);
        if (task == null || task.isFinished()) {
            return;
        }
        Template template = templateMapper.selectById(task.getTemplateId());
        if (template == null) {
            taskMapper.updateFailure(task.getId(), TaskEntity.STAGE_MATERIAL_CHECK, "模板不存在或已下架");
            return;
        }
        try {
            executeStages(task, template);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Task {} interrupted", taskNo);
        } catch (Exception e) {
            log.error("Task {} failed unexpectedly", taskNo, e);
            taskMapper.updateFailure(task.getId(), TaskEntity.STAGE_MATERIAL_CHECK,
                    "任务执行异常: " + e.getMessage());
        }
    }

    // visible for testing
    void executeStages(TaskEntity task, Template template) throws InterruptedException {
        List<Asset> assets = taskMapper.selectTaskAssetRecords(task.getId());

        // 阶段一：素材检查
        enterStage(task, TaskEntity.STAGE_MATERIAL_CHECK);
        delay(simulation.getMaterialCheckMs());
        String checkError = checkMaterials(template, assets);
        if (checkError != null || shouldFailAt(TaskEntity.STAGE_MATERIAL_CHECK)) {
            failNow(task, TaskEntity.STAGE_MATERIAL_CHECK,
                    checkError != null ? checkError : simulation.getFailReason());
            return;
        }

        // 阶段二：模拟生成
        enterStage(task, TaskEntity.STAGE_SIMULATED_GENERATE);
        delay(simulation.getSimulatedGenerateMs());
        if (shouldFailAt(TaskEntity.STAGE_SIMULATED_GENERATE)) {
            failNow(task, TaskEntity.STAGE_SIMULATED_GENERATE, simulation.getFailReason());
            return;
        }

        // 阶段三：结果整理
        enterStage(task, TaskEntity.STAGE_RESULT_ORGANIZE);
        delay(simulation.getResultOrganizeMs());
        if (shouldFailAt(TaskEntity.STAGE_RESULT_ORGANIZE)) {
            failNow(task, TaskEntity.STAGE_RESULT_ORGANIZE, simulation.getFailReason());
            return;
        }

        taskMapper.updateResult(task.getId(), template.getResultUrl());
        log.info("Task {} succeeded", task.getTaskNo());
    }

    private void enterStage(TaskEntity task, String stage) {
        taskMapper.updateStatus(task.getId(), TaskEntity.STATUS_PROCESSING, stage);
        task.setStatus(TaskEntity.STATUS_PROCESSING);
        task.setCurrentStage(stage);
    }

    private void failNow(TaskEntity task, String stage, String reason) {
        log.info("Task {} failed at stage {}: {}", task.getTaskNo(), stage, reason);
        taskMapper.updateFailure(task.getId(), stage, reason);
    }

    private boolean shouldFailAt(String stage) {
        return simulation.getFailStage() != null && simulation.getFailStage().equalsIgnoreCase(stage);
    }

    private String checkMaterials(Template template, List<Asset> assets) {
        if (assets == null || assets.size() != template.getRequiredImageCount()) {
            return "素材数量不符合模板要求（需要 " + template.getRequiredImageCount() + " 张）";
        }
        for (Asset asset : assets) {
            if (!storageService.exists(asset.getStoredPath())) {
                return "找不到已上传的素材文件: " + asset.getOriginalName();
            }
        }
        return null;
    }

    // visible for testing：单测中覆写以避免真实休眠
    protected void delay(long millis) throws InterruptedException {
        if (millis > 0) {
            Thread.sleep(millis);
        }
    }
}
