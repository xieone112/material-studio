package com.example.studio.controller;

import com.example.studio.service.TaskService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /**
     * 提交制作任务：完成校验并创建任务记录后立即返回任务 ID，
     * 后续三个阶段由 Java 后台异步执行，不依赖浏览器会话。
     */
    @PostMapping
    public Map<String, Object> create(@RequestHeader("X-User-Id") String userId,
                                      @org.springframework.web.bind.annotation.RequestBody CreateTaskRequest request) {
        String taskId = taskService.createTask(userId, request.getTemplateId(), request.getAssetIds());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("taskId", taskId);
        return body;
    }

    /** 查询个人任务列表（历史记录）。查询只读取记录，不会推动任务执行。 */
    @GetMapping
    public Map<String, Object> list(@RequestHeader("X-User-Id") String userId) {
        List<Map<String, Object>> items = taskService.listUserTasks(userId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        return body;
    }

    @GetMapping("/{taskId}")
    public Map<String, Object> detail(@RequestHeader("X-User-Id") String userId,
                                      @PathVariable String taskId) {
        return taskService.getTask(userId, taskId);
    }

    @DeleteMapping("/{taskId}")
    public Map<String, Object> delete(@RequestHeader("X-User-Id") String userId,
                                      @PathVariable String taskId) {
        taskService.deleteTask(userId, taskId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("deleted", true);
        return body;
    }

    public static class CreateTaskRequest {
        private String templateId;
        private List<Long> assetIds;

        public String getTemplateId() { return templateId; }
        public void setTemplateId(String templateId) { this.templateId = templateId; }
        public List<Long> getAssetIds() { return assetIds; }
        public void setAssetIds(List<Long> assetIds) { this.assetIds = assetIds; }
    }
}
