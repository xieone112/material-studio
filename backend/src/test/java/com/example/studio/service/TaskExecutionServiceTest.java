package com.example.studio.service;

import com.example.studio.mapper.AssetMapper;
import com.example.studio.mapper.TaskMapper;
import com.example.studio.mapper.TemplateMapper;
import com.example.studio.model.Asset;
import com.example.studio.model.TaskEntity;
import com.example.studio.model.Template;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 后台任务执行的关键行为测试：
 * 1. 三个阶段必须按“素材检查 → 模拟生成 → 结果整理”顺序执行；
 * 2. 指定阶段失败后，后续阶段不再执行，失败阶段与原因被持久化；
 * 3. 素材数量不符合要求时在素材检查阶段失败。
 */
class TaskExecutionServiceTest {

    private TaskMapper taskMapper;
    private TemplateMapper templateMapper;
    private AssetMapper assetMapper;
    private StorageService storageService;
    private SimulationManager simulation;
    private TaskExecutionService service;

    private TaskEntity task;
    private Template template;

    @BeforeEach
    void setUp() {
        taskMapper = mock(TaskMapper.class);
        templateMapper = mock(TemplateMapper.class);
        assetMapper = mock(AssetMapper.class);
        storageService = mock(StorageService.class);
        simulation = new SimulationManager();
        simulation.setMaterialCheckMs(0);
        simulation.setSimulatedGenerateMs(0);
        simulation.setResultOrganizeMs(0);
        simulation.setFailStage("NONE");

        service = new TaskExecutionService(taskMapper, templateMapper, assetMapper, storageService, simulation) {
            @Override
            protected void delay(long millis) {
                // 测试中不真实休眠
            }
        };

        task = new TaskEntity();
        task.setId(1L);
        task.setTaskNo("T1");
        task.setUserId("user-1");
        task.setTemplateId("tpl-1");
        task.setStatus(TaskEntity.STATUS_PENDING);

        template = new Template();
        template.setId("tpl-1");
        template.setTitle("Demo");
        template.setRequiredImageCount(1);
        template.setResultUrl("/demo/res-demo.svg");

        when(templateMapper.selectById("tpl-1")).thenReturn(template);
    }

    private Asset asset(long id) {
        Asset a = new Asset();
        a.setId(id);
        a.setStoredPath("/tmp/asset-" + id + ".png");
        a.setOriginalName("asset-" + id + ".png");
        return a;
    }

    @Test
    void stagesExecuteInOrderAndSucceed() throws InterruptedException {
        when(taskMapper.selectTaskAssetRecords(1L)).thenReturn(List.of(asset(10L)));
        when(storageService.exists(anyString())).thenReturn(true);

        service.executeStages(task, template);

        InOrder inOrder = inOrder(taskMapper);
        inOrder.verify(taskMapper).updateStatus(1L, TaskEntity.STATUS_PROCESSING, TaskEntity.STAGE_MATERIAL_CHECK);
        inOrder.verify(taskMapper).updateStatus(1L, TaskEntity.STATUS_PROCESSING, TaskEntity.STAGE_SIMULATED_GENERATE);
        inOrder.verify(taskMapper).updateStatus(1L, TaskEntity.STATUS_PROCESSING, TaskEntity.STAGE_RESULT_ORGANIZE);
        inOrder.verify(taskMapper).updateResult(1L, "/demo/res-demo.svg");

        verify(taskMapper, never()).updateFailure(anyLong(), anyString(), anyString());
    }

    @Test
    void failureAtSimulatedGenerateStopsRemainingStages() throws InterruptedException {
        simulation.setFailStage("SIMULATED_GENERATE");
        when(taskMapper.selectTaskAssetRecords(1L)).thenReturn(List.of(asset(10L)));
        when(storageService.exists(anyString())).thenReturn(true);

        service.executeStages(task, template);

        // 素材检查与模拟生成已开始
        verify(taskMapper).updateStatus(1L, TaskEntity.STATUS_PROCESSING, TaskEntity.STAGE_MATERIAL_CHECK);
        verify(taskMapper).updateStatus(1L, TaskEntity.STATUS_PROCESSING, TaskEntity.STAGE_SIMULATED_GENERATE);
        // 失败后停止后续步骤：结果整理不应开始
        verify(taskMapper, never()).updateStatus(eq(1L), anyString(), eq(TaskEntity.STAGE_RESULT_ORGANIZE));
        verify(taskMapper).updateFailure(1L, TaskEntity.STAGE_SIMULATED_GENERATE, simulation.getFailReason());
        verify(taskMapper, never()).updateResult(anyLong(), anyString());
    }

    @Test
    void missingMaterialsFailAtMaterialCheck() throws InterruptedException {
        when(taskMapper.selectTaskAssetRecords(1L)).thenReturn(List.of());

        service.executeStages(task, template);

        ArgumentCaptor<String> reason = ArgumentCaptor.forClass(String.class);
        verify(taskMapper).updateFailure(eq(1L), eq(TaskEntity.STAGE_MATERIAL_CHECK), reason.capture());
        assertThat(reason.getValue()).contains("素材数量");
        verify(taskMapper, never()).updateStatus(1L, TaskEntity.STATUS_PROCESSING, TaskEntity.STAGE_SIMULATED_GENERATE);
        verify(taskMapper, never()).updateResult(anyLong(), anyString());
    }
}
