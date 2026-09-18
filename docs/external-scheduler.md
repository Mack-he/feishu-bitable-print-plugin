# 用外部调度器触发部门同步

> **默认不需要看这份文档。** 自建 / Docker 部署请用应用内置的调度器（见 README「部门定时同步 / 方式一」），配 `DEPARTMENT_SYNC_SCHEDULE_ENABLED=true` 即可，不依赖任何外部系统。
>
> 这份文档面向两种情况：
> 1. **Serverless 部署**（Vercel 等）：进程不常驻，内置定时器不可用；
> 2. **已经统一用某个调度平台**（XXL-Job、K8s CronJob…），或想从服务器上手工触发一次同步。

## 接口

`GET|POST /api/cron/departments/sync`，**必须带尾斜杠**（应用开了 `trailingSlash: true`，不带会先返回 308）。

```bash
curl -sSL --max-time 300 -w '\n%{http_code}\n' \
  -H "X-Cron-Secret: $DEPARTMENT_SYNC_CRON_SECRET" \
  "http://<应用地址>/api/cron/departments/sync/"
```

- **密钥**：环境变量 `DEPARTMENT_SYNC_CRON_SECRET`（生成示例 `openssl rand -hex 24`）。**未配置时接口返回 503（默认关闭）**，不会裸奔；读取顺序是 `system_configs` 表 → 环境变量。调用时用 `X-Cron-Secret` 头，或 `?secret=xxx`（便于只能配 URL 的调度器）。
- **参数**（都走 query）：`all=false` 只刷一批（默认 `true`，一次调用覆盖全部用户）、`userBatchSize`（默认 500，上限 5000）、`timeBudgetMs`（默认 240000，即 4 分钟）、`userOffset`（指定起点）。
- **续传**：不传 `userOffset` 时，服务端把刷到哪儿记在 `system_configs` 的 `DEPARTMENT_SYNC_USER_CURSOR`，刷完自动归零；内置调度器用的是同一个位置。所以即使调度器或反向代理读超时很短（如 nginx 默认 `proxy_read_timeout 60s`）、单次只完成一部分，多次调度也会接着推进，最终覆盖全部用户。
- **防重入**：同进程内正在同步时再触发返回 409；多副本/并发由调度器的阻塞策略兜底。

⚠️ 两个坑都会让任务「看起来成功、其实没同步」：

- 不带尾斜杠会 308。curl 要加 `-L`；不能跟随跳转的客户端（如 XXL-Job 内置 `httpJobHandler` 使用的 Java HttpURLConnection，对 308 支持不可靠）必须直接写带尾斜杠的地址。
- `curl -sS` 在 HTTP 4xx/5xx 时**退出码仍然是 0**，会被记成成功。必须自己判状态码，或加 `-f`。

## 现成脚本

仓库里的脚本已经处理好尾斜杠跳转、状态码判断和错误输出，退出码可直接被调度器识别为任务成败：

```bash
# Linux / macOS / Git Bash
APP_BASE_URL=http://127.0.0.1:5000 DEPARTMENT_SYNC_CRON_SECRET=xxx \
  bash scripts/cron-department-sync.sh

# Windows（PowerShell）——脚本刻意保持纯 ASCII
$env:APP_BASE_URL = "http://127.0.0.1:5000"; $env:DEPARTMENT_SYNC_CRON_SECRET = "xxx"
powershell -ExecutionPolicy Bypass -File .\scripts\cron-department-sync.ps1
```

两个脚本都接受一个位置参数当作查询串（XXL-Job 的「任务参数」会作为第一个参数传入），例如 `all=false&userBatchSize=30`。

> PowerShell 版刻意只用英文提示：Windows PowerShell 5.1 按系统 ANSI 代码页（中文 Windows 是 GBK）读取 `.ps1`，**非 ASCII 字符会导致语法错误**；GLUE(PowerShell) 把脚本落到临时文件执行时同样如此。接口返回的中文消息不受影响（已带 `charset=utf-8`）。
>
> `.sh` 只用 POSIX 语法：GLUE(Shell) 在 Linux 上用 `/bin/sh`（dash）执行，`[[ ]]`、`pipefail` 之类会导致脚本直接失败。

## XXL-Job 接法

> **本应用不是 XXL-Job 执行器，应用侧不需要配置 admin 地址 / accessToken / appname**。它不向调度中心注册、不上报心跳，只被动接收执行器发来的 HTTP 调用（XXL-Job 只有 Java 执行器 SDK，没有 Node SDK）。上面那个 `DEPARTMENT_SYNC_CRON_SECRET` 和调度中心的 `accessToken` 是两回事，别混用。
>
> 下面这些参数属于**执行器**（Java 项目里），配错的表现是控制台「执行器-地址列表」为 `null`、调度直接 `Address Router Fail`：
>
> ```yaml
> xxl:
>   job:
>     admin:
>       addresses: http://localhost:8899/xxljob-sj   # 注意带上 context-path
>       accessToken: xxx                              # 必须与调度中心一致
>     executor:
>       appname: xxx                                  # 必须与「执行器管理」里的 AppName 一致
>       port: 9999
> ```
>
> 任务的「执行器」要选这个 AppName。另外记住：**GLUE(Shell) / GLUE(PowerShell) 脚本是在该执行器所在的机器上执行的**，所以脚本里的应用地址（`APP_BASE_URL`）必须是那台机器能访问到的地址——同机可用 `127.0.0.1:5000`，跨机要用局域网 IP，容器内要用 `host.docker.internal`。

四种接法，按执行器情况选：

1. **GLUE(Shell) / GLUE(PowerShell)**（推荐，超时可控）

   运行模式选 `GLUE(Shell)`（Windows 执行器选 `GLUE(PowerShell)`，因为 GLUE(Shell) 需要机器上有 `sh`），把 `scripts/cron-department-sync.sh` / `.ps1` 的内容贴进 GLUE 编辑器即可（执行器进程里要有 `DEPARTMENT_SYNC_CRON_SECRET` 环境变量，或把密钥写在脚本里——GLUE 脚本存在调度中心库里，仅管理员可见）。

   - 调度类型 Cron，Quartz 表达式 `0 0 3,15 * * ?` 即每天 3 点、15 点各一次。
   - 阻塞处理策略建议「丢弃后续调度」或「单机串行」。
   - 失败重试次数 1；任务超时时间填 300 以上或 0（不限制），别用默认值卡断全量同步。
   - GLUE 脚本按**退出码**判定成败，脚本里非 200 会 `exit 1`，失败会正常触发重试与告警。

2. **已有 Java 执行器里加个 handler**（应用地址不方便暴露给执行器机器时用这个）

   ```java
   @Component
   public class DepartmentSyncJob {

       @Value("${app.base-url}")            private String baseUrl;   // 例：http://print-app:5000
       @Value("${department.sync.secret}")  private String secret;

       private final HttpClient httpClient = HttpClient.newBuilder()
               .connectTimeout(Duration.ofSeconds(10))
               .build();

       @XxlJob("departmentSync")
       public void departmentSync() throws Exception {
           // 地址必须带尾斜杠：应用开了 trailingSlash，不带会 308（HttpURLConnection 对 308 支持不可靠）
           HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/api/cron/departments/sync/"))
                   .timeout(Duration.ofMinutes(5))   // 全量同步可能跑几分钟；读超时别设太小
                   .header("X-Cron-Secret", secret)
                   .POST(HttpRequest.BodyPublishers.noBody())
                   .build();

           HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
           XxlJobHelper.log("部门同步 HTTP {} body={}", response.statusCode(), response.body());

           if (response.statusCode() == 200) {
               XxlJobHelper.handleSuccess("部门同步完成");
           } else {
               XxlJobHelper.handleFail("部门同步失败：HTTP " + response.statusCode() + " " + response.body());
           }
       }
   }
   ```

   用 RestTemplate 同理，关键是 `readTimeout` 给到 5 分钟；`handleFail` 会让调度中心按失败处理并告警。

3. **内置 `httpJobHandler`**：任务 Handler 填 `httpJobHandler`，任务参数填 `http://<应用地址>/api/cron/departments/sync/?secret=xxx`（**必须带尾斜杠**，它不跟随 308）。它读超时只有秒级，规模大时建议加 `&all=false&userBatchSize=30` 让单次调用几秒内返回——服务端会记住续传位置，之后的调度接着往前刷。

4. **命令行任务（`commandJobHandler`）**：运行模式选 `BEAN`，JobHandler 填 `commandJobHandler`，任务参数填整条命令：

   ```
   curl -fsSL "http://127.0.0.1:5000/api/cron/departments/sync/?secret=xxx"
   ```

   它用 `Runtime.exec` 直接执行（Windows 上不经过 `cmd.exe`）：管道、重定向、`-H "X-Cron-Secret: ..."` 这类带引号的参数都容易被拆错，所以密钥放 query 里最省事（代价是密钥会出现在任务参数与应用访问日志里）。**必须带 `-f`**，否则 curl 在 HTTP 4xx/5xx 时退出码仍是 0，失败会被记成成功。

## 其他调度方式

Linux `crontab -e` 加一行（用仓库脚本，输出进日志便于排查）：

```bash
0 3,15 * * * DEPARTMENT_SYNC_CRON_SECRET=xxx APP_BASE_URL=http://127.0.0.1:5000 \
  bash /path/to/scripts/cron-department-sync.sh >> /var/log/dept-sync.log 2>&1
```

systemd timer、Windows 计划任务（curl 或 PowerShell `Invoke-RestMethod`）、K8s CronJob 同理，调用同一个脚本或同一个地址；Vercel 可在 `vercel.json` 里加 `crons`（注意 Serverless 函数有时长上限，建议配小 `userBatchSize` 分批跑）。