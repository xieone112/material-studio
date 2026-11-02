package com.example.studio.mapper;

import com.example.studio.model.TaskEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TaskMapper {

    int insert(TaskEntity task);

    int insertTaskAsset(@Param("taskId") Long taskId,
                        @Param("assetId") Long assetId,
                        @Param("sortOrder") int sortOrder);

    TaskEntity selectByNo(@Param("taskNo") String taskNo);

    List<TaskEntity> selectByUser(@Param("userId") String userId);

    List<String> selectTaskAssets(@Param("taskId") Long taskId);

    List<com.example.studio.model.Asset> selectTaskAssetRecords(@Param("taskId") Long taskId);

    int updateStatus(@Param("taskId") Long taskId,
                     @Param("status") String status,
                     @Param("currentStage") String currentStage);

    int updateFailure(@Param("taskId") Long taskId,
                      @Param("failureStage") String failureStage,
                      @Param("failureReason") String failureReason);

    int updateResult(@Param("taskId") Long taskId,
                     @Param("resultUrl") String resultUrl);

    int deleteByNo(@Param("taskNo") String taskNo,
                   @Param("userId") String userId);

    int deleteByUser(@Param("userId") String userId);
}
