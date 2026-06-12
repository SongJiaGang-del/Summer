# 夏日律动 — 第二轮分步执行 Prompt（纯前端 / 期末作业版）

> 配套文档：`AUDIT.md`（缺陷清单与解决方法）
> 定位：纯前端 + 本地存储，无后端、无账户。
> 每个 Phase 是独立可复制粘贴的完整 prompt。顺序即推荐执行顺序。

---

## ⚠️ 项目通用约束（每次都带上）

> 项目 `Summer` 是 **uni-app x（uvue + uts）**，原生渲染，限制：
> - 类型严格：`reactive/ref/对象常量`都要显式命名类型，不能写内联对象类型 `: { a: string }`
> - 跨组件数组 prop 类型必须双方 import 同一个 `.uts`，否则运行时 `UTSJSONObject cannot be cast` 崩
> - `v-for` 迭代对象会自动解包字段里的 `Ref` → 不能把 Ref 嵌进数据结构，用"元数据数组 + 平行 ref 数组"
> - 字符串下标 `s[0]` 返回 `Char`，用 `s.substring(i, i+1)`；`substr` 已废弃用 `substring`
> - 没有 `offsetLeft/Width`，用 `ref<UniElement>` + `getBoundingClientRect()`
> - 没有 `uni.upx2px`，用项目已有的 `utils/responsive.uts` 的 `rpx2px()`
> - `@keyframes` 不支持 `from/to` 选择器，动画用 JS 驱动 + `:style`
> - `any` 是 Kotlin `Any?`：不能赋 null、不能属性访问；外部 SDK 用全局类型（`InnerAudioContext`/`UniElement`/`TouchEvent`）或自定义接口；可空对象访问用 `obj!.xxx`
> - `setInterval` 不接受命名函数引用，要传 arrow：`setInterval(() => { fn() }, ms)`
> - `uni.vibrateShort` 在 uts 类型严格，项目已用 `utils/haptic.uts` 的 `tapHaptic()` 占位
>
> 动效底座：`utils/tween.uts`（中心 ticker + 打断）+ `utils/ease.uts` + `composables/use-anim.uts`（`tweenRef`）
> 状态层：`store/player.uts`；设计 token：`utils/tokens.uts`；响应式：`utils/responsive.uts`

---

## Phase A — 消灭死按钮（P0，最高优先级）⭐

### 目标
把所有"看起来能用实际没反应"的交互，要么补全要么删除。诚实度优先。

### Prompt

```
项目 Summer 有几处死按钮 / 假交互，逐个修复：

1. 场景传送门跳转（缺陷1）:
   - 新建 pages/scene/scene.uvue，接收 ?moodId=xxx&name=xxx 参数（onLoad 里取）
   - 给 store 的 playlist 每首歌补一个 moodId 字段（4 首分配到 3 个 mood）
   - scene 页：顶部该场景大图 + 标题，下面是该 moodId 过滤后的歌单列表，点击播放
   - 顶部返回按钮 uni.navigateBack()
   - index.uvue 的 onEnterPortal(moodId, name) 改为：setMood(moodId) + uni.navigateTo({ url: '/pages/scene/scene?moodId=' + moodId + '&name=' + encodeURIComponent(name) })
   - scene-card 的 @enter 要把 name 一起传出来

2. 发现页搜索框真实化（缺陷3）:
   - 把 <text class="search-placeholder"> 改成 <input v-model="searchKeyword" placeholder="...">
   - searchKeyword 实时过滤 playlist（title 或 artist 包含关键词）
   - 过滤结果显示在"每日精选"上方的"搜索结果"区，空查询时 v-if 隐藏该区

3. 白噪音混音器（缺陷2）——二选一:
   - 方案A（有音频素材）：/static/ambient/ 放 wave.mp3 / cicada.mp3 / rain.mp3，
     store 每轨建 InnerAudioContext (loop=true)，toggleAmbient 控制 play/pause
   - 方案B（无素材）：直接删除 mixer-drawer 组件 + app-header 的 mixer 按钮 + store 的 ambients 相关代码
   - 先按方案A 写，如果我没提供音频文件就回退方案B 并告诉我

遵守 uvue 约束，完成后跑编译。
```

---

## Phase B — 系统适配与加载反馈（P0）⭐

### 目标
状态栏安全区 + 音频 buffering 反馈，解决"被遮挡"和"像卡死"。

### Prompt

```
项目 Summer 修复系统适配和加载反馈：

1. 状态栏安全区（缺陷5）:
   - App.uvue onLaunch 里 uni.getSystemInfoSync() 取 statusBarHeight 和 safeAreaInsets.bottom
   - 存到 store（新增 export const sysInsets = reactive({ top, bottom })）
   - app-header 顶部 padding-top 动态加 sysInsets.top（:style 绑定）
   - index.uvue 底部 footer 的 mini-wrap padding-bottom 加 sysInsets.bottom

2. 音频 buffering 反馈（缺陷4）:
   - store 加 state.buffering，ensureAudio 里监听 audio.onWaiting(() => state.buffering=true)
     和 audio.onCanplay(() => state.buffering=false)
   - vinyl-disc 接收 buffering prop，buffering 为 true 时在唱片中心叠一个旋转小圆点
     （JS 驱动 rotate，复用现有 setInterval 旋转逻辑或单独一个）
   - index.uvue 把 state.buffering 传给 vinyl-disc

遵守 uvue 约束（getSystemInfoSync 返回类型、InnerAudioContext 事件），完成后跑编译。
```

---

## Phase C — 老用户体验细节（P1）

### 目标
splash 可跳过、进度条占位、手势引导、最近播放入口、scroll 保留。

### Prompt

```
项目 Summer 优化老用户日常体验：

1. Splash 可跳过（缺陷6）:
   - splash-screen 根 view 加 @click 立即 emit('done')
   - 用 storage K.LAUNCHED 标记，非首次启动直接不显示 splash（首次保留）

2. 进度条空状态（缺陷7）:
   - progress-bar 的 formatTime 在 props.duration <= 0 时返回 '--:--'
   - duration <= 0 时 thumb 用 v-if 隐藏，fill 宽度 0

3. 手势说明（缺陷8，选轻量方案）:
   - 律动页右上角加一个 ❓ 圆形按钮
   - 点击弹出一个 glass 弹层，列出 4 条手势：
     「单击唱片 播放/暂停」「唱片上下滑 调音量」「拖动进度条 跳转」「点击歌词 跳到该句」
   - 每条配一个 emoji 图标

4. 最近播放入口（缺陷9）:
   - 发现页"场景传送门"上方加"最近播放"横向滚动区
   - 读 store 的 recents（最多 10 条），每项小封面 + 标题，点击 playSong
   - recents 为空时隐藏整个区块

5. 三页 scroll 保留（缺陷10）:
   - 三页的 v-if 改为 v-show（常驻不卸载）
   - 注意：v-show 下所有页同时存在，确认动画/定时器不会重复触发

遵守 uvue 约束，完成后跑编译。
```

---

## Phase D — Token 真正接入 + 歌词诚实化（P1）

### 目标
让 tokens.uts 不再是废文档；歌词组件诚实定位。

### Prompt

```
项目 Summer 落实设计 token 和歌词定位：

1. Token 接入（缺陷11）:
   - 在 uni.scss 声明 SCSS 变量：$deep-sea: #1B4965; $minty: #AEEFF0; $coral: #FF8577;
     $lemon: #FFF275; $radius-sm/md/lg/xl/pill; 等
   - 把这些高频组件的硬编码色值/圆角替换为 SCSS 变量：
     vinyl-disc / island-core / scene-card / bottom-nav / mood-selector
   - uts 逻辑里需要色值字符串的地方（如 store 的 mood 色）import utils/tokens.uts 的 Colors
   - 目标：grep '#1B4965' 在这几个组件里归零

2. 歌词诚实化（缺陷12，选轻量方案）:
   - lyrics-scroll 顶部加一行极小的标注「♪ 沉浸歌词」，弱化"逐字精准同步"的预期
   - 样式低调（micro 字号 + deepSeaA45 颜色）
   - 不改推进逻辑（仍按 progress 百分比，定位为"诗意陪伴"而非卡拉OK）

遵守 uvue 约束，完成后跑编译并确认视觉无回退。
```

---

## Phase E — mood 联动 + 升级庆祝（P2，答辩亮点）⭐

### 目标
把"做了一半"的 mood 体系做完；放大升级"哇时刻"。

### Prompt

```
项目 Summer 强化 mood 联动和升级庆祝（这是答辩展示重点）：

1. mood 联动内容（缺陷13）:
   - 利用 Phase A 给 playlist 加的 moodId 字段
   - 发现页"每日精选"按当前 state.moodId 排序（匹配的歌排前面）
   - 场景传送门里，当前 mood 对应的那张卡加一个高亮边框 / 角标
   - app-header 已显示 mood emoji，确认切 mood 时联动刷新

2. 升级庆祝（缺陷14 + 15）:
   - store 累计 totalPlaySeconds 时检测是否跨过 600 秒整数倍（升级临界）
   - 跨过时设置一个一次性事件标记（如 export const levelUpEvent = ref(0)，每次升级 +1）
   - 注意：从 storage 加载历史等级时不触发（用 audioInited / 首次累计标记区分）
   - index.uvue watch levelUpEvent，触发：全屏短暂粒子动画 + uni.showToast 显示新称号 + tapHaptic
   - 等级头衔扩到 8-10 段，前期间隔小（LV1/2/3 各一称号），让新用户快速尝到升级

遵守 uvue 约束（ref 不嵌套进 v-for 数据结构），完成后跑编译。
```

---

## Phase F — 加分项：年度报告 + 存档导出（P3 选做）

### 目标
答辩高光：一张可截图的"夏日报告"卡片 + 本地存档迁移。

### Prompt

```
项目 Summer 增加两个纯前端加分功能：

1. 夏日报告卡片（缺陷22）:
   - 小岛页底部加"生成我的夏日报告"按钮
   - 点击弹出一张全屏卡片：总播放时长 / 最爱 mood（moodCounts 最大项）/
     听过歌曲数 / 当前等级与称号 / 一句根据数据生成的文案
   - 卡片用品牌渐变背景 + 大字排版，适合截图
   - 加一个"长按保存图片"提示（uvue 可用 takeSnapshot 或提示用户截图）

2. 存档导出/导入（缺陷21）:
   - 设置入口（app-header mixer 旁加一个齿轮，或小岛页底部）
   - "导出存档"：把所有 storage（mood/song/stats/recents/bottles）序列化成一段 JSON 字符串，
     用 uni.setClipboardData 复制到剪贴板
   - "导入存档"：粘贴字符串，解析后写回 storage 并刷新
   - 这样换设备也能迁移，无需后端

遵守 uvue 约束，完成后跑编译。
```

---

## Phase G — 性能与工程（P2/P3 选做，加分）

### Prompt

```
项目 Summer 工程优化（作业严谨度加分）：

1. 合并定时器（缺陷18）:
   - 当前有 3 个 setInterval：vinyl 自旋 / tween ticker / image-fallback shimmer
   - 抽一个全局帧调度器 utils/ticker.uts：单个 setInterval(16)，对外暴露 onFrame(cb) 注册 / offFrame 注销
   - vinyl-disc / image-fallback / tween 都改用它，空闲（无注册者）时自动停

2. store 自检（缺陷20）:
   - 新建一个隐藏的自检页 pages/dev/selftest.uvue（仅开发用）
   - 对 store 纯逻辑写断言：levelTitle 各区间正确 / nextSong 循环正确 /
     vibeDnasComputed 百分比和为100（或0）/ accumulatePlay 累加正确
   - 页面上用红绿色块显示每条 pass/fail

遵守 uvue 约束，完成后跑编译。
```

---

## 执行建议（期末作业最优路径）

```
必做：  Phase A → Phase B           (消灭所有死按钮 + 系统适配)   ~1.5d
建议：  Phase C → Phase D           (老用户体验 + token 落实)      ~2d
亮点：  Phase E                     (mood 联动 + 升级庆祝)         ~1d  ← 答辩展示
加分：  Phase F (年度报告) 选 1-2 件                              ~0.5d ← 答辩高光
弹性：  Phase G                     (性能 + 自检)                  选做
```

**答辩展示脚本建议**：
1. 启动 → splash（首次仪式感）
2. 律动页播放 → 唱针落下 + 黑胶转 + 歌词滚 + 进度拖拽
3. 上下滑唱片调音量 → 浮窗
4. 切 mood → 全屏色彩过渡 + 发现页推荐联动
5. 进入场景传送门 → 跳转场景歌单页
6. 连续播放触发升级 → 全屏庆祝 + 新称号 toast
7. 小岛页 → LV 进度 + 真实 Vibe DNA + 生成夏日报告卡片

每完成一个 Phase 跑一次编译，按错误对照"项目通用约束"修正。
