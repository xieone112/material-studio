package com.example.studio.service;

import com.example.studio.common.ApiException;
import com.example.studio.mapper.AssetMapper;
import com.example.studio.mapper.TaskMapper;
import com.example.studio.mapper.TemplateMapper;
import com.example.studio.model.Asset;
import com.example.studio.model.TaskEntity;
import com.example.studio.model.Template;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    private final TaskMapper taskMapper;
    private final TemplateMapper templateMapper;
    private final AssetMapper assetMapper;
    private final ExecutorService taskExecutor;
    private final TransactionTemplate transactionTemplate;

    public TaskService(TaskMapper taskMapper,
                       TemplateMapper templateMapper,
                       AssetMapper assetMapper,
                       @Qualifier("taskExecutor") ExecutorService taskExecutor,
                       TransactionTemplate transactionTemplate) {
        this.taskMapper = taskMapper;
        this.templateMapper = templateMapper;
        this.assetMapper = assetMapper;
        this.taskExecutor = taskExecutor;
        this.transactionTemplate = transactionTemplate;
    }

    /** 创建任务：先完成校验并持久化任务记录，再投递后台执行，立即返回任务 ID。 */
    public String createTask(String userId, String templateId, List<Long> assetIds) {
        Template template = templateMapper.selectById(templateId);
        if (template == null) {
            throw new ApiException(404, "模板不存在或已下架");
        }
        if (assetIds == null || assetIds.size() != template.getRequiredImageCount()) {
            throw new ApiException(400, "素材数量不符合模板要求（需要 " + template.getRequiredImageCount() + " 张）");
        }
        List<Asset> assets = assetMapper.selectByIds(assetIds);
        if (assets.size() != assetIds.size()) {
            throw new ApiException(400, "存在无效的素材引用");
        }
        for (Asset asset : assets) {
            if (!userId.equals(asset.getUserId())) {
                throw new ApiException(403, "素材不属于当前用户");
            }
            if (!template.acceptedMimeList().contains(asset.getMimeType())) {
                throw new ApiException(400, "素材类型不符合模板要求: " + asset.getOriginalName());
            }
            if (asset.getSizeBytes() > template.getMaxFileSizeBytes()) {
                throw new ApiException(400, "素材大小超过模板限制: " + asset.getOriginalName());
            }
        }

        String taskNo = "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        transactionTemplate.executeWithoutResult(tx -> {
            TaskEntity task = new TaskEntity();
            task.setTaskNo(taskNo);
            task.setUserId(userId);
            task.setTemplateId(templateId);
            task.setStatus(TaskEntity.STATUS_PENDING);
            taskMapper.insert(task);
            for (int i = 0; i < assetIds.size(); i++) {
                taskMapper.insertTaskAsset(task.getId(), assetIds.get(i), i);
            }
        });

        // 事务提交后再投递后台执行；关闭页面不影响后台任务
        taskExecutor.submit(() -> executionLogger(taskNo));
        log.info("Task {} accepted for user {}", taskNo, userId);
        return taskNo;
    }

    private void executionLogger(String taskNo) {
        try {
            taskExecutionServiceProxy().run(taskNo);
        } catch (Exception e) {
            log.error("Background task {} crashed", taskNo, e);
        }
    }

    // 避免循环依赖的自引用代理（同类内部异步调用）
    private TaskExecutionService taskExecutionServiceProxy() {
        return executionService;
    }

    private TaskExecutionService executionService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setExecutionService(TaskExecutionService executionService) {
        this.executionService = executionService;
    }

    public Map<String, Object> toDto(TaskEntity task) {
        Template template = templateMapper.selectById(task.getTemplateId());
        List<String> assetUrls = taskMapper.selectTaskAssets(task.getId());
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("taskId", task.getTaskNo());
        dto.put("templateId", task.getTemplateId());
        dto.put("templateTitle", template == null ? task.getTemplateId() : template.getTitle());
        dto.put("templateCoverUrl", template == null ? null : template.getCoverUrl());
        dto.put("status", task.getStatus());
        dto.put("currentStage", task.getCurrentStage());
        dto.put("failureStage", task.getFailureStage());
        dto.put("failureReason", task.getFailureReason());
        dto.put("resultUrl", task.getResultUrl());
        dto.put("assetUrls", assetUrls);
        dto.put("createdAt", task.getCreatedAt());
        dto.put("updatedAt", task.getUpdatedAt());
        return dto;
    }

    public List<Map<String, Object>> listUserTasks(String userId) {
        return taskMapper.selectByUser(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getTask(String userId, String taskNo) {
        TaskEntity task = taskMapper.selectByNo(taskNo);
        if (task == null || !task.getUserId().equals(userId)) {
            throw new ApiException(404, "任务不存在");
        }
        return toDto(task);
    }

    public void deleteTask(String userId, String taskNo) {
        TaskEntity task = taskMapper.selectByNo(taskNo);
        if (task == null || !task.getUserId().equals(userId)) {
            throw new ApiException(404, "任务不存在");
        }
        taskMapper.deleteByNo(taskNo, userId);
    }
}
