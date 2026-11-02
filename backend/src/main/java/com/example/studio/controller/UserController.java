package com.example.studio.controller;

import com.example.studio.common.ApiException;
import com.example.studio.mapper.AppUserMapper;
import com.example.studio.mapper.TaskMapper;
import com.example.studio.model.AppUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 用户身份：演示项目不引入真实登录体系，用户 ID 由前端首次访问时生成（UUID），
 * 通过 X-User-Id 请求头携带；后端据此自动注册资料并隔离个人任务记录。
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AppUserMapper appUserMapper;
    private final TaskMapper taskMapper;

    public UserController(AppUserMapper appUserMapper, TaskMapper taskMapper) {
        this.appUserMapper = appUserMapper;
        this.taskMapper = taskMapper;
    }

    /** 获取当前用户资料；首次访问自动注册，昵称默认取用户 ID 后 6 位。 */
    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("X-User-Id") String userId) {
        return toDto(ensureUser(userId));
    }

    /** 更新昵称与邮箱。 */
    @PutMapping("/me")
    public Map<String, Object> update(@RequestHeader("X-User-Id") String userId,
                                      @RequestBody UpdateProfileRequest request) {
        ensureUser(userId);
        String nickname = request.getNickname() == null ? "" : request.getNickname().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        if (nickname.isEmpty() || nickname.length() > 64) {
            throw new ApiException(400, "昵称不能为空且不超过 64 个字符");
        }
        if (email.length() > 128) {
            throw new ApiException(400, "邮箱不能超过 128 个字符");
        }
        appUserMapper.updateProfile(userId, nickname, email);
        return toDto(appUserMapper.selectById(userId));
    }

    /**
     * 删除账号（演示“重置身份”）：清除用户资料与个人全部任务记录。
     * 前端随后生成新的用户 ID，等价于换了一个全新身份。
     */
    @DeleteMapping("/me")
    @Transactional
    public Map<String, Object> delete(@RequestHeader("X-User-Id") String userId) {
        ensureUser(userId);
        taskMapper.deleteByUser(userId);
        appUserMapper.deleteById(userId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("deleted", true);
        return body;
    }

    private AppUser ensureUser(String userId) {
        if (userId == null || userId.isBlank() || userId.length() > 64) {
            throw new ApiException(400, "非法的用户身份");
        }
        AppUser user = appUserMapper.selectById(userId);
        if (user == null) {
            user = new AppUser();
            user.setUserId(userId);
            user.setNickname("用户-" + userId.substring(Math.max(0, userId.length() - 6)));
            user.setEmail("");
            appUserMapper.insert(user);
            user = appUserMapper.selectById(userId);
        }
        return user;
    }

    private Map<String, Object> toDto(AppUser user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("userId", user.getUserId());
        dto.put("nickname", user.getNickname());
        dto.put("email", user.getEmail());
        dto.put("createdAt", user.getCreatedAt() == null ? null : user.getCreatedAt().toString());
        return dto;
    }

    public static class UpdateProfileRequest {
        private String nickname;
        private String email;

        public String getNickname() { return nickname; }
        public void setNickname(String nickname) { this.nickname = nickname; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
