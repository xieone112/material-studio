# Material Studio — 素材制作网站

一个可独立运行的素材制作网站：浏览模板 → 上传图片 → 提交制作任务 → 后台异步处理（三步骤）→ 查看历史记录与结果。

- **前端**：Next.js 14.2.5（App Router）+ React 18 + TypeScript 5.4，纯 CSS（无 UI 库）
- **后端**：Java 11+（本地验证使用 JDK 13 / 17 均可编译运行）+ Spring Boot 2.7.18 + MyBatis 2.3.1
- **数据库**：MySQL 8.0
- **CI**：GitHub Actions（前端 lint / typecheck / test / build；后端 test / package）
- **容器化**：docker compose 一键启动前端、后端、MySQL 与初始化数据

> 本项目不接入真实 AI 服务，制作流程通过可控制耗时与成功/失败的模拟生成器完成，重点验证 Java 后端多步骤异步任务处理与前端多任务异步状态管理。

## 一、项目结构

```
.
├── frontend/                 # Next.js 前端
│   ├── src/app/page.tsx              # 模板列表页（UI-01）
│   ├── src/app/templates/[id]/       # 模板详情制作页 + 历史面板（UI-02/03）
│   ├── src/lib/api.ts                # 接口封装（X-User-Id 身份头）
│   ├── src/lib/taskStore.ts          # 多任务状态纯函数层（可单测）
│   ├── src/lib/useTaskTracker.ts     # 轮询跟踪 Hook（仅未完成任务，结束即停）
│   └── src/lib/taskStore.test.ts     # 前端关键行为测试
├── backend/                  # Spring Boot 后端
│   ├── src/main/java/com/example/studio/
│   │   ├── controller/       # Template / Upload / Task / DevSimulation 接口
│   │   ├── service/          # TaskService（受理）、TaskExecutionService（三步执行）
│   │   ├── mapper/           # MyBatis Mapper
│   │   ├── config/           # 线程池、CORS、上传目录静态映射
│   │   └── common/           # 统一异常处理
│   ├── src/main/resources/mapper/    # MyBatis XML
│   ├── src/main/resources/static/demo/ # 模板封面与结果示例图（SVG）
│   ├── src/test/java/…/TaskExecutionServiceTest.java  # 步骤顺序与失败中断测试
│   ├── db/schema.sql / seed.sql      # 建表与种子数据
│   └── scripts/gen-demo-assets.mjs   # 示例素材生成脚本
├── .github/workflows/ci.yml  # CI 配置
└── docker-compose.yml        # 一键容器化启动
```

## 二、启动方式

### 方式 A：docker compose（推荐）

```bash
docker compose up --build
# 前端: http://localhost:3000   后端: http://localhost:8080
```

MySQL 首次启动会自动执行 `backend/db/` 下的 `schema.sql` 与 `seed.sql` 完成初始化。

### 方式 B：本地手动启动

1. 准备 MySQL 8.0，执行初始化：

```bash
mysql -uroot -p < backend/db/schema.sql
mysql -uroot -p < backend/db/seed.sql
```

2. 配置并启动后端（默认连接 `localhost:3306`，库名 `material_studio`，账号 `root`，空密码；可用环境变量覆盖）：

```bash
cd backend
mvn package
DB_PASSWORD=你的密码 java -jar target/material-studio-backend-1.0.0.jar
```

可用环境变量：`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`、`UPLOAD_DIR`（上传目录，默认 `./data/uploads`）、`CORS_ORIGINS`（默认 `http://localhost:3000`）。

3. 启动前端：

```bash
cd frontend
npm install
BACKEND_ORIGIN=http://localhost:8080 npm run dev
# 打开 http://localhost:3000
```

前端通过 Next.js rewrites 将 `/backend/api/*` 代理到 Java 后端（`BACKEND_ORIGIN` 可配置），页面统一走同源请求。

## 三、主要接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/templates?channel=&category=` | 模板列表（可按频道/分类筛选） |
| GET | `/api/templates/{id}` | 模板详情 |
| POST | `/api/uploads` | 图片上传（multipart：`file`、`templateId`），服务端校验类型与大小 |
| POST | `/api/tasks` | 创建制作任务，body：`{ "templateId": "...", "assetIds": [1,2] }`，校验后立即返回 `{ "taskId" }` |
| GET | `/api/tasks` | 个人任务列表（历史记录） |
| GET | `/api/tasks/{taskId}` | 单个任务状态（只读，不推动任务执行） |
| DELETE | `/api/tasks/{taskId}` | 删除个人任务 |
| GET/PUT | `/api/dev/simulation` | 开发调试：查看/调整模拟失败阶段与各阶段耗时 |

所有业务请求需携带 `X-User-Id` 请求头标识用户身份。

### 任务状态与处理阶段

- 任务整体状态：`PENDING`（等待处理）→ `PROCESSING`（处理中）→ `SUCCESS` / `FAILED`（终态，不会因后续查询回退）
- 处理阶段：`MATERIAL_CHECK`（素材检查）→ `SIMULATED_GENERATE`（模拟生成）→ `RESULT_ORGANIZE`（结果整理）
- 失败时记录 `failureStage` + `failureReason`，并停止后续步骤
- 成功时记录 `resultUrl`（服务端可访问的结果图片地址）

### 后台异步执行方式

任务提交接口只做校验并写入 `task` / `task_asset` 表（事务内），事务提交后将任务投递到后端线程池（2 个工作线程，队列可扩展）。工作线程从数据库重新读取任务，按三个阶段顺序执行：

1. 进入阶段前先更新 `status=PROCESSING` 与 `current_stage`（每一步都有独立可观察的执行边界）；
2. 阶段内通过 `SimulationManager` 的毫秒数模拟耗时；
3. 阶段结束持久化结果：素材检查校验素材数量与文件存在性；模拟生成与结果整理按配置成功或失败；
4. 任一阶段失败即停止后续步骤，写入失败阶段与原因；
5. 查询接口只读取数据库记录，绝不通过查询推动任务进入下一阶段。

关闭页面、刷新页面均不影响后台执行（任务生命周期与浏览器会话无关）。

## 四、演示方法

### 成功流程

1. 打开 `http://localhost:3000`，进入任一模板（如"萌宠摇摆舞"）；
2. 按提示上传所需数量图片（预览、替换、移除均可操作）；
3. 点击 **立即制作**，右侧历史记录立即出现任务卡片：等待处理 → 处理中（显示当前阶段）→ 成功（展示结果图）。

### 指定阶段失败

通过开发接口设置失败阶段（只影响之后提交的任务）。**Windows cmd 下必须整行粘贴**，JSON 里的引号需 `\"` 转义（PowerShell 外层用单引号即可）：

```cmd
:: 第 1 步：设置"结果整理"阶段失败（也可换成 MATERIAL_CHECK / SIMULATED_GENERATE）
curl -X PUT http://localhost:8080/api/dev/simulation -H "Content-Type: application/json" -d "{\"failStage\":\"RESULT_ORGANIZE\"}"
```

返回 `"failStage":"RESULT_ORGANIZE"` 即设置成功。

```cmd
:: 第 2 步：测完恢复全部成功
curl -X PUT http://localhost:8080/api/dev/simulation -H "Content-Type: application/json" -d "{\"failStage\":\"NONE\"}"
```

三个失败阶段与出现失败的时间点（默认耗时下）：

| failStage | 失败阶段 | 提交后约 |
| --- | --- | --- |
| `MATERIAL_CHECK` | 素材检查 | 4 秒 |
| `SIMULATED_GENERATE` | 模拟生成 | 10 秒 |
| `RESULT_ORGANIZE` | 结果整理 | 13 秒 |

页面验证：设置失败阶段后进入任一模板 → 上传图片 → 点击 **立即制作**，任务走到对应阶段时卡片变红显示"失败"及失败原因（含失败阶段），后续步骤不再执行；历史记录页可用"失败"筛选项单独查看。

也可通过环境变量 `SIMULATOR_FAIL_STAGE` 在后端启动时预设。

### 调整处理耗时

```cmd
curl -X PUT http://localhost:8080/api/dev/simulation -H "Content-Type: application/json" -d "{\"materialCheckMs\":8000,\"simulatedGenerateMs\":10000,\"resultOrganizeMs\":5000}"
```

默认耗时：素材检查 4s、模拟生成 6s、结果整理 3s，便于观察状态流转。

### 多任务与状态隔离

在处理中状态下连续提交多个任务（可切换不同模板），各任务卡片独立展示阶段、结果或失败原因，互不覆盖。

### 刷新恢复

任务处理中刷新页面：历史记录从后端恢复，未完成任务继续自动轮询，直到结束。

### 查询异常 ≠ 任务失败

停止后端进程后再刷新页面：前端保留已有任务信息并显示"查询异常，保留历史数据"提示，不会把任务误标为失败；重启后端后自动恢复查询。

## 五、用户身份与个人记录

### 方案设计

- **身份生成**：前端首次访问时生成 UUID（`crypto.randomUUID()`）存入 `localStorage`（key: `ms-user-id`），后续所有请求通过 `X-User-Id` 请求头携带，无感知完成"注册"。
- **后端隔离**：素材上传、任务提交/查询/删除均按 `X-User-Id` 校验归属，个人数据互不可见。
- **用户资料表**：`app_user` 表（user_id / nickname / email / created_at）。首次携带新 ID 访问 `GET /api/users/me` 时自动注册，默认昵称为"用户-{ID后6位}"。
- **资料管理接口**：
  - `GET /api/users/me` — 获取资料（不存在自动创建）
  - `PUT /api/users/me` — 修改昵称 / 邮箱
  - `DELETE /api/users/me` — 删除账号：清空资料与个人全部任务记录
- **前端入口**：三个页面顶栏均有绿色头像按钮（显示昵称首字），点击弹出 **Account Settings** 弹窗，可修改昵称/邮箱并实时同步头像；"Delete Account" 区域提供"清空并重置身份"，等价于换一个全新用户。

### 演示方法

1. **查看身份**：打开首页，点击右上角头像 → 弹窗显示当前昵称与 User ID。
2. **修改资料**：在弹窗中把昵称改为"小影"并保存，提示"已保存"，头像与昵称即时更新；刷新后依然生效（保存在后端）。
3. **个人记录隔离**：用两个浏览器（或无痕窗口）分别访问，各自提交的制作任务只出现在自己的 History 面板与历史记录页（`/history`）中。
4. **重置身份**：弹窗底部 Delete Account → "…" → "确认清空并重置身份"，页面回到初始状态：生成新 User ID、历史记录为空、昵称恢复默认。
5. **接口级验证**：
   ```bash
   curl -H "X-User-Id: demo-1" http://localhost:8080/api/users/me
   curl -X PUT -H "X-User-Id: demo-1" -H "Content-Type: application/json" \
        -d '{"nickname":"小影","email":"demo@test.com"}' http://localhost:8080/api/users/me
   curl -X DELETE -H "X-User-Id: demo-1" http://localhost:8080/api/users/me
   ```

### 已知限制

该方案为演示级身份设计，无登录鉴权与密码；更换设备/清除浏览器数据将视为新用户。生产环境可替换为真实登录体系，后端只需将 `X-User-Id` 改为从会话/Token 解析，数据隔离逻辑无需改动。

## 六、测试

```bash
# 后端：步骤顺序、失败中断、素材校验
cd backend && mvn test

# 前端：多任务隔离、查询异常与任务失败区分、跟踪生命周期
cd frontend && npm test
```

## 七、CI

`.github/workflows/ci.yml` 在 push / pull request 时执行：

- **frontend**：`npm ci` → lint → typecheck → vitest → build
- **backend**：`mvn -B test package`（Temurin 17）

## 八、部署与回滚

- **部署**：任意装有 Docker 的主机执行 `docker compose up -d --build`；数据（MySQL、上传素材）分别落在 `mysql-data`、`upload-data` 卷中。
- **回滚**：`docker compose down` 后用上一个镜像/提交重新 `up -d --build`；数据卷保留不受影响。

## 九、AI 使用说明

本项目开发过程中使用了 AI 编程工具（Trae / Claude / GLM）：按"执行计划"拆解任务（数据库 → 后端接口 → 异步执行 → 前端页面 → 状态管理 → 测试 → CI/容器），为每个模块提供题目约束与既有代码作为上下文生成初版，再逐段人工审查、修正（如 MyBatis XML 语法、Bean 装配问题）并实际运行验证（接口 curl 联调、浏览器页面走查、单测）。示例：后台三阶段执行器由 AI 生成骨架后，人工补充了"事务提交后再投递线程池"与"查询接口不推动任务"两处关键约束。

## 十、已完成 / 未完成与已知限制

**已完成：**

- 模板列表（频道/分类筛选）、详情、上传（预览/替换/移除、前后端双重校验）
- 任务受理即返 ID、后台三阶段异步执行、失败阶段中断、状态/阶段/结果持久化
- 模拟器：指定阶段失败、各阶段耗时可调（配置 + 运行时调试接口）
- 前端多任务隔离轮询、查询异常保留现场、刷新恢复、终态停止跟踪、卸载清理
- 关键行为测试（后端 3 例、前端 5 例）、GitHub Actions CI、docker compose

**未完成 / 已知限制（如实说明）：**

- 服务重启后处理中任务不会自动恢复执行（保持 PROCESSING，需重新提交）；未实现任务幂等、断点续跑与自动重试——当前方案下重启属低频演示场景，故按题目要求不引入额外复杂度。
- 身份为 UUID 演示级方案，无登录鉴权（见第五节）。
- 制作结果为预置示例图（SVG），非真实图片处理；结果仅支持预览。
- 删除任务不清理已上传的物理文件（不影响演示）。

**实际投入：** 约 1.5 个工作日（架构与数据 0.2d、后端 0.5d、前端 0.5d、联调与交付 0.3d）。
