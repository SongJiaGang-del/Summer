# 夏日律动 — 缺陷审计与解决方案

> 定位：**期末作业 / 纯前端 + 本地存储**，不接后端、不做账户。
> 已剔除需要服务端的项（真实推荐算法、好友系统、云端账户）。
> 每条含：现状 → 问题 → 解决方法（uvue 可落地）。

---

## 🔴 P0 — 影响"诚实度"，必须立刻修（死按钮 / 假交互）

### 缺陷 1：场景传送门点了不跳转
- **现状**：`onEnterPortal()` 只调 `setMood()`，`pages/scene/scene` 已登记但从未跳转。
- **问题**：点"沙滩派对"卡片只换了背景色，是死按钮。
- **解决**：
  - 新建 `pages/scene/scene.uvue`，接收 `?moodId=xxx&name=xxx` 参数。
  - 页面内：顶部大图 + 该 mood 过滤后的歌单（从 `playlist` 按 mood 标签筛，没有 mood 标签就给每首歌补一个 `moodId` 字段）。
  - `onEnterPortal()` 改为 `setMood(moodId)` + `uni.navigateTo({ url: '/pages/scene/scene?moodId=' + moodId + '&name=' + name })`。
  - 返回时整页 mood 恢复（onShow 时 setMood 回原值，或不恢复，让用户停在场景 mood）。

### 缺陷 2：白噪音混音器没声音
- **现状**：mixer-drawer 开关只亮 LED，无音频。
- **问题**：UI 暗示会出环境音，实际纯装饰。
- **解决**：
  - `/static/ambient/` 放 3 个循环音频：`wave.mp3` / `cicada.mp3` / `rain.mp3`（找 CC0 素材，或用极短的循环片段）。
  - store 里每轨建一个 `InnerAudioContext`，`loop = true`，`toggleAmbient()` 控制 play/pause + 音量。
  - 多轨可叠加播放，与主音乐音频独立。
  - **若找不到音频素材**：直接把 mixer 入口和组件删掉，不留死按钮。

### 缺陷 3：发现页搜索框打不了字
- **现状**：`<text class="search-placeholder">` 是文本，不是输入框。
- **问题**：看起来能搜，敲了没反应。
- **解决**：
  - 改为 `<input v-model="searchKeyword" />`（uvue 支持 input）。
  - `searchKeyword` 实时过滤 `playlist`（按 title / artist 包含匹配）。
  - 结果显示在"每日精选"上方的"搜索结果"区；空查询时隐藏该区。

### 缺陷 4：音频加载期间无 buffering 反馈
- **现状**：远程 mp3 加载 1-3 秒，vinyl 不转，像卡死。
- **问题**：用户以为 App 死了。
- **解决**：
  - store 加 `state.buffering`，监听 `audio.onWaiting(() => buffering=true)` / `audio.onCanplay(() => buffering=false)`。
  - vinyl-disc 接收 `buffering` prop，buffering 时在唱片中心显示一个旋转小圆点 / 三点呼吸动效。

### 缺陷 5：顶栏被系统状态栏遮挡
- **现状**：`navigationStyle: custom` 但 app-header 无 `statusBarHeight` 顶部留白。
- **问题**：刘海屏标题和状态栏重叠。
- **解决**：
  - `uni.getSystemInfoSync().statusBarHeight` 取一次，存到 store 或全局。
  - app-header 顶部 `padding-top` 加上这个值（用 `:style` 动态绑）。
  - 底部 footer 同理加 `safeAreaInsets.bottom` 防 home indicator 遮挡。

---

## 🟠 P1 — 影响老用户日常幸福感

### 缺陷 6：Splash 不可跳过，每次都看 1.6s
- **解决**：
  - splash 根 view 加 `@click="skip"`，立即 `emit('done')`。
  - 或记 `K.LAUNCHED` 标记，非首次启动直接不渲染 splash（首次保留仪式感）。

### 缺陷 7：duration=0 时进度条显示 "0:00 / 0:00"
- **解决**：
  - `formatTime` 在 `duration <= 0` 时返回 `--:--`。
  - fill 宽度 0、thumb `v-if="duration > 0"` 隐藏。

### 缺陷 8：核心手势无引导
- **现状**：单击 toggle / 上下滑音量 / 拖进度 / 点歌词 seek 全靠猜。
- **解决**（二选一）：
  - **轻量**：律动页右上角放 `❓` 按钮，点开一个手势说明弹层（图标 + 一句话）。
  - **完整**：首次启动 3 屏引导（带箭头动画 + "试试在唱片上下滑动调音量"）。记 `K.GUIDE_SHOWN`。

### 缺陷 9：recents 历史只写不读（死数据）
- **现状**：`pushRecent` 存了 30 条，UI 无入口。
- **解决**：
  - 发现页顶部加"最近播放"横向滚动区（读 `recents`，最多 10 条，点击直接播）。
  - 或律动页下拉看历史。
  - **若不做入口**：删掉 `pushRecent` / `recents` / `K.RECENTS`，别留死逻辑。

### 缺陷 10：三页切换丢失 scroll 位置
- **现状**：v-if 卸载 scroll-view。
- **解决**：
  - v-if 改 v-show（三页常驻不卸载）。
  - 或每页 `@scroll` 存 scrollTop 到 `savedScrollTops[i]`，切回时 `:scroll-top` 恢复。

### 缺陷 11：token 定义了不接入
- **现状**：`tokens.uts` 完整但全项目继续硬编码颜色 / 圆角 / 时长。
- **解决**：
  - `uni.scss` 同步声明 SCSS 变量（`$deep-sea: #1B4965` 等）。
  - 把高频组件（vinyl-disc / island-core / scene-card / bottom-nav / mood-selector）的硬编码色值换成 `$deep-sea` 等变量。
  - uts 逻辑里用色值的地方 import `Colors`。

### 缺陷 12：歌词是装饰，非真同步
- **现状**：歌词随 `progress` 百分比推进，非 LRC 时间戳；配演奏曲显得假。
- **解决**（二选一，作业建议选轻量）：
  - **轻量（推荐）**：承认是"诗意陪伴"，歌词容器加一行小字标注"♪ 沉浸歌词"，弱化"逐字精准"的预期。或把歌词换成与画面呼应的氛围短句。
  - **完整**：给每首歌加 LRC 时间戳数组 `[{time, text}]`，按 `audio.currentTime` 匹配当前行。

---

## 🟡 P2 — 产品成熟度 polish

### 缺陷 13：mood 只换色，不联动内容
- **解决**：
  - 给 `playlist` 每首歌补 `moodId` 字段。
  - 发现页"每日精选"按当前 mood 排序（匹配的排前）。
  - 漂流瓶 / 场景卡按 mood 高亮当前对应项。

### 缺陷 14：升级"哇时刻"缺失 / 时机错
- **现状**：level 从 storage 加载不触发庆祝；升级只有 core 轻微 scale。
- **解决**：
  - 在 store 累计逻辑里检测"跨过 600 秒整数倍" → 触发一次性升级事件。
  - index.uvue 监听该事件 → 全屏粒子 + toast「恭喜成为 海盐巡游者」+ haptic。
  - 加载历史等级时**不**触发（用初始化标记区分）。

### 缺陷 15：等级头衔只有 5 段
- **解决**：扩到 8–10 段，前期间隔小（LV1/2/3 各一个称号），让新用户快速尝到升级甜头。

### 缺陷 16：漂流瓶不能投 / 不能回
- **现状**：4 条死消息 const 数组。
- **解决**：
  - bottles 从 storage 加载（首次写入预设 + 之后持久化）。
  - bottle-modal 加"回信"按钮，写一条 reply 入库。
  - 发现页加"投瓶"按钮，输入文本（限 80 字）+ 可附当前歌。

### 缺陷 17：音量手势职责散落主页
- **解决**：vinyl-disc 内部识别上下滑，emit `volume-delta`，主页只管浮窗 UI。

### 缺陷 18：三个 setInterval 并行
- **现状**：vinyl 自旋 16ms + tween ticker 16ms + shimmer 30ms。
- **解决**：合并到一个全局帧调度器，组件按需注册帧回调；空闲时停。低端机更省电。

---

## 🟢 P3 — 远期 / 加分项（作业可选）

### 缺陷 19：playlist 硬编码 4 首
- **纯前端方案**：把 `/static/music/` 放更多本地音频（10-15 首），歌词 / 封面一起本地化。避免远程加载慢 + 断网失效。

### 缺陷 20：零测试
- **纯前端方案**：store 纯函数（accumulatePlay / nextSong / setMood / levelTitle）写几个 uts 单元测试，或至少写一个"自检页"手动跑断言，作为作业的工程严谨度加分。

### 缺陷 21：换设备清零（无账户）
- **纯前端方案**：做"导出 / 导入存档"——把 storage 序列化成一段字符串，用户可复制保存。不需要后端也能"迁移"。加分项。

### 缺陷 22：年度报告 / 数据可视化
- **纯前端方案**：基于本地 stats 生成一张"夏日报告"卡片（总时长 / 最爱 mood / 听过歌曲数 / 当前称号），可截图分享。纯前端可做，是很好的作业展示亮点。

---

## 紧急度矩阵

| 优先级 | 影响 | 项数 | 预估 | 作业建议 |
|---|---|---|---|---|
| 🔴 P0 | 用户立刻看出"假" | 5 | ~1.5d | **必做** |
| 🟠 P1 | 老用户长期不爽 | 7 | ~2d | **建议做** |
| 🟡 P2 | 成熟度 polish | 6 | ~3d | 挑 2-3 件做亮点 |
| 🟢 P3 | 加分项 | 4 | 弹性 | 选 1 件（推荐缺陷 22 年度报告）做展示高光 |

**作业最优路径**：P0 全做 → P1 做 6/7/8/9/10 → P2 做 13/14 → P3 做 22。
这样既消除所有"假交互"，又有「mood 联动 + 升级庆祝 + 年度报告」三个能在答辩现场展示的亮点。
