package com.example.studio.mapper;

import com.example.studio.model.AppUser;
import org.apache.ibatis.annotations.Param;

public interface AppUserMapper {

    AppUser selectById(@Param("userId") String userId);

    int insert(AppUser user);

    int updateProfile(@Param("userId") String userId,
                      @Param("nickname") String nickname,
                      @Param("email") String email);

    int deleteById(@Param("userId") String userId);
}
