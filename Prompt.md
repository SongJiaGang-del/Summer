# 夏日律动 - 分步完善 Prompt 手册

> 每个阶段都是一个**独立可执行**的 prompt，复制粘贴给 Claude/Cursor 即可继续推进。
> 顺序按 ROI 排序，前 3 步建议优先完成；4–9 步可按需穿插。

---

## ⚠️ 项目通用约束（每次都该带上）

> 项目 `Summer` 是 **uni-app x（uvue + uts）** 项目，**不是普通 uniapp**。原生渲染，无 DOM，下列限制必须遵守：
>
> - 类型严格：`reactive({...})` / `ref({...})` / 任何对象常量都要显式标命名类型（不能写 `: { a: string }` 内联对象类型）
> - 数组 prop 跨组件传递时，类型必须双方 import 自同一个 `.uts`，否则运行时 `UTSJSONObject cannot be cast` 崩
> - `v-for` 迭代对象时，对象字段里的 `Ref<T>` 会被 vue 自动解包 → 不能把 Ref 嵌进数据结构，要用"元数据数组 + 平行 ref 数组"模式
> - 字符串下标 `s[0]` 返回 `Char` 不能直接拼字符串，用 `s.substring(i, i+1)`
> - 没有 `offsetLeft/Width`，用 `ref<UniElement>` + `getBoundingClientRect()`
> - `@keyframes` 不支持 `from/to` 选择器（uvue 只支持 class 选择器）；动画用 JS 驱动 + `:style` 绑定
> - `uni.vibrateShort()` 参数类型在 uts 里严格，目前 `utils/haptic.uts` 是 noop
> - `string.substr()` 已 deprecated，用 `substring()`
> - 浮点数不能直接做数组下标，用 `Math.floor()` 或 `loadInt()`
>
> 项目动效底座：`utils/tween.uts` + `utils/ease.uts` + `composables/use-anim.uts`，所有动画都基于 `tweenRef()`。
> 状态层：`store/player.uts`，所有共享数据从这里 import。

---

## Phase 1 — 接真实音频 + 音量手势 ⭐ 最高优先级

### 目标
让"夏日律动"真的能放歌。当前 `state.progress` 是 setInterval 模拟的假时钟，没有音频引擎，所有交互都在假装播放。

### Prompt

```
为项目 Summer (uni-app x / uvue) 接入真实音频引擎并补上音量控制。

1. 在 store/player.uts:
   - 引入 uni.createInnerAudioContext() 单例，持久化到模块顶层
   - playSong() 切换 audio.src 并 audio.play()
   - togglePlay() 控制 audio.play() / audio.pause()
   - audio.onTimeUpdate 回写 state.progress（百分比），audio.onEnded 触发 nextSong()
   - audio.duration 暴露为 state.duration（秒）
   - 删除原 setInterval 模拟进度的代码（pages/index/index.uvue onMounted 里）
   - playlist 的每首歌增加 audioUrl 字段（先用免费 CDN 音乐资源，如 https://music.163.com/song/media/outer/url?id=xxx 或自备 cdn）

2. 新增音量控制:
   - store 加 state.volume (0-1)，audio.volume 同步
   - 律动页的 vinyl-disc 外层包一个 view，监听 @touchstart/move/end
   - 在 vinyl 上下滑动距离映射到 volume 增减
   - 屏幕中央浮一个临时的音量指示条（仅滑动时显示，1.5s 后自动消失）
   - 滑动结束时把 volume 落盘到 storage

3. progress-bar 拖拽时：
   - 拖拽期间 audio.pause() + 显示当前拖拽位置歌词
   - 松手时 audio.seek(progress * duration / 100) + 恢复播放
   - 时间气泡使用真实 state.duration 而不是写死的 210

遵守 utils/haptic.uts 注释里的 uvue 约束。完成后跑编译验证。
```

---

## Phase 2 — tween 引擎升级（打断 + 中心 ticker）⭐

### 目标
当前每个 tween 一个 setInterval(16ms)，splash 同时跑 16 个就是 16 个定时器。同一 ref 被并发 tween 时还会闪烁。

### Prompt

```
重构项目 Summer 的 tween 引擎 (utils/tween.uts + composables/use-anim.uts)，要求：

1. 中心 ticker：
   - 全局只有一个 setInterval(16)，维护活跃 tween 列表
   - 每帧遍历所有 tween 推进，完成的从列表移除
   - 列表空时自动停 ticker，新增 tween 时按需启动
   - 接口对外保持不变 (tween / tweenRef / tweenColor)

2. 打断机制：
   - tweenRef(target, ...) 内部维护一个 WeakMap<Ref<number>, TweenHandle>
   - 启动新 tween 前自动 cancel 同 ref 上的旧 tween
   - 这样用户连点 3 次 mood 切换时只会执行最后一次的色彩 tween

3. 时间源换 performance.now()，比 Date.now() 更稳

4. 修复后用 mood-selector 连点测试：从 sea-salt 快速点 strawberry → mint → sea-salt，整个过程颜色应平滑过渡不抖。

注意 uts 类型严格：WeakMap 用 Map<Ref<number>, TweenHandle> 替代（uts 不一定有 WeakMap）。完成后跑编译。
```

---

## Phase 3 — 真实数据流：播放时长 → 岛屿 LV / Vibe DNA ⭐

### 目标
当前小岛页所有数据是假的（LV.4 / 124m / 65% SeaPop），用户第一次惊艳第三次就识破了。

### Prompt

```
项目 Summer 的小岛页数据全是 hardcode，让它真正动起来：

1. store/player.uts 新增统计：
   - stats.totalPlaySeconds: 累计播放秒数（监听 audio.onTimeUpdate 累加）
   - stats.moodSeconds: { 'sea-salt': N, 'strawberry': N, 'mint': N }（每首歌按当前 mood 累加）
   - stats.songsListened: Set<index>
   - 全部 watch + 节流落盘到 storage (每 30 秒写一次)

2. 计算派生字段:
   - level = Math.floor(totalPlaySeconds / 600) + 1  // 每 10 分钟一级
   - expPercent = (totalPlaySeconds % 600) / 600 * 100  // 当前等级进度
   - vibeDnas 数组从 moodSeconds 实时计算百分比

3. 替换 components/island-core/island-core.uvue：
   - 接收 level / expPercent props
   - 在 LV 数字外圈加一个 expPercent 的圆环进度（用 view rotate 半圆 + 半圆叠加）
   - 升级时（watch level 变化）触发庆祝动画：脉冲 + scale 1.2 + 粒子飘动

4. 替换 components/vibe-dna-bar：从 store 直接读 vibeDnas computed
   - 第一首歌还没听完时全部显示 0%，提示"开始听歌解锁你的画像"

5. stat-card 的"潜水深度"改成总播放时长（小时:分钟）；"心跳"改成今日播放歌曲数

6. 删掉所有 hardcode：移除 state.temperature、写死的 LV.4、写死的"日落追逐者"称号

完成后 totalPlaySeconds 累到 600+ 时应能看到 LV 升级动画。
```

---

## Phase 4 — 黑胶细节修正 + 切歌过渡

### 目标
唱针目前是悬空的；切歌是"啪"地一下，毫无质感。

### Prompt

```
精修项目 Summer 的 vinyl-disc 组件 + 切歌动画：

1. 唱针位置矫正:
   - 唱针 hub（旋转中心点）应在唱片**右上方外缘 + 一定 padding**，针尖**落在唱片表面**（约 disc 半径的 70%-95% 区域，模拟外圈到内圈）
   - 当前 transform-origin 是 100% 0%，调整到针 hub 实际位置
   - 播放时针尖应**慢慢从外缘向内圈移动**（rotate 角度随 state.progress 变化，0% 时落在外缘，100% 时接近中心）

2. 针落音效（视觉）:
   - 播放从暂停态切到播放态时，针先快速落下 (200ms outBack) + 唱片**抖动一下**（0.5s 内 rotate 微震 1 度）
   - 模拟真实"咔嗒"接触

3. 切歌过渡（store nextSong/prevSong/playSong）:
   - 用 ref discRotationSpeed，从 1 减到 0 (400ms)
   - 0 时换 currentSong (cover 也淡出再淡入)
   - 速度从 0 恢复到 1 (600ms outBack)
   - 期间 vinyl-disc 的 setInterval rotation tick 用 speed 调制

4. 切歌时歌词容器整体淡出再淡入（300ms 出 + 400ms 进），currentLyricIndex 重置为 0

完成后切歌应有"慢→停→换→快"的物理感。
```

---

## Phase 5 — 设计 token 抽离

### 目标
项目里 `#1B4965` 写了 30 次，`rgba(27,73,101,0.x)` 10 个不同 alpha，duration 20 种不同数值。任何一处改色都要 grep。

### Prompt

```
抽离项目 Summer 的设计 token，建立单一来源：

1. 新建 utils/tokens.uts:
   - COLORS: { deepSea, deepSeaA10, deepSeaA20, ..., minty, coral, lemon }
   - RADIUS: { sm: 16, md: 28, lg: 40, xl: 56, pill: 999 }
   - DURATION: { instant: 110, fast: 220, normal: 380, slow: 600, ambient: 1200 }
   - SHADOW: { ... }

2. 同步 uni.scss 暴露 SCSS 变量（uvue 的 style 也能用 var）:
   $deep-sea: #1B4965;
   $minty: #AEEFF0;
   ...

3. 全项目搜索替换:
   - 所有 #1B4965 / #AEEFF0 / #FF8577 / #FFF275 改为 var/常量引用
   - 所有 rgba 透明度变体合并到不超过 4 档 (a8 / a20 / a45 / a80)
   - duration 收敛到 5 档以内

4. 真正用上 glass-panel 组件:
   - album-card / stat-card / mixer-drawer / mini-player / bottom-nav 全部替换为 <glass-panel> 包裹
   - 这些组件里的"玻璃"样式直接删除

5. 跑编译验证 + 视觉对照前后无差异。

uvue 注意：tokens.uts 里的对象常量必须显式标命名类型（同 K / Ease 的写法）。
```

---

## Phase 6 — 清理假数据 / 文案 / 死代码

### 目标
完成 Phase 1-5 后做一次大扫除，让产品"诚实"。

### Prompt

```
为项目 Summer 做诚实化清理：

1. 删除/重命名假数据（Phase 3 之后还残留的）:
   - 顶部 31°C 整个移除（或改为当前 mood emoji + 友好问候）
   - "日落追逐者" 称号改为按等级动态映射 (LV1: 初探深海 / LV5: 海盐巡游者 / LV10: 日落追逐者 / LV20: 海洋之心)

2. 文案优化:
   - bottle-modal "回归大海" → "知道了" (主) + "回信"(次)
   - "进入传送门" → 副标题 "查看歌单"
   - "ISLAND ENERGY" → 中文 "岛屿能量"
   - "VIBE DNA" → "音乐画像"
   - "SCENE PORTALS" → "场景歌单"

3. 死代码清理:
   - 删除 composables/use-anim.uts 里的 useStaggerEntry（无人使用）
   - 删除 store/player.uts 的 currentMood computed（已被 bgColor 取代）
   - 删除 toggleFocus / isFocusMode（vinyl 双击 Focus 模式从未实现）
   - 删除 setPage（无人调用）

4. 修复死按钮:
   - 发现页搜索框：要么删掉，要么真接 input 实现搜索 (按 song.title 过滤 playlist)
   - 顶部 mixer 按钮：保留并跳通到 mixer-drawer ✓ (已完成)
   - vinyl 双击 Focus：要么补全，要么砍掉

5. 写一份 docs/UVUE_NOTES.md，记录踩过的 9 个 uvue 限制（参考本文件顶部"项目通用约束"段）

完成后 grep `// TODO|// FIXME|// hardcode` 应为 0。
```

---

## Phase 7 — 加载态 + 错误边界

### Prompt

```
项目 Summer 的图片加载和错误处理缺失，补上：

1. 新建 components/image-fallback/image-fallback.uvue，封装 <image>:
   - 加载中：显示 mood 主色的渐变方块 (linear-gradient 在 uvue 支持基础场景) + 轻微脉冲
   - 加载失败：显示 emoji + "图片走丢了" 文案
   - 全项目所有 <image> 替换为 <image-fallback>

2. store 加错误边界:
   - currentSong computed 处理 playlist 空数组的情况，返回占位 song
   - bgColor 初始化失败时 fallback 到 hexToRgb('#E0F7FA')
   - audio 加载失败时 uni.showToast 提示并跳过到 nextSong

3. 网络异常友好提示:
   - uni.onNetworkStatusChange，断网时顶部弹一条"离线模式"横幅
   - 离线时 cover 用 storage 缓存的本地 base64（如做了图片缓存）或灰底

完成后断网测试：能正常打开 App，看到友好提示而不是白屏。
```

---

## Phase 8 — 三页滚动保留 + 手势导航

### Prompt

```
项目 Summer 三页切换体验优化：

1. 修复滚动位置丢失:
   - 把 v-if 改成 v-show （但保留每页 scroll-view 独立），切页时不再 unmount
   - 或：在每页 scrollTop 监听并存入 store，切回来时恢复

2. 手势横向切页:
   - 在三页外层 view 监听 @touchstart/move/end
   - 横向滑动距离 > 屏宽 25% 时触发 selectedIndex 切换
   - 切换中实时跟随手指拖动（不只是松手后跳转）

3. 律动页左右滑切歌:
   - vinyl-disc 外层独立监听横向滑动
   - 与三页切换冲突时优先识别 vinyl 上的滑动

4. 转场动画曲线优化:
   - 当前 outBack 420ms 有点弹，频繁切页累
   - 改为 inOutCubic 280ms，稳重

完成后体验应接近 iOS Apple Music 的横向切换流畅度。
```

---

## Phase 9 — 发现页功能化（漂流瓶 / 搜索 / 场景）

### Prompt

```
让项目 Summer 的发现页"动起来"，不只是装饰：

1. 漂流瓶系统:
   - bottles 从 storage 加载（首次写入 4 条预设 + 用户每次写入持久化）
   - 加"投瓶" FAB：弹底部抽屉输入文本（限 80 字） + 选当前歌作为附带
   - bottle-modal 加"回信"按钮：写一条 reply 关联到原瓶 id
   - 每个瓶子加"漂流方向"动画：发现页背景层从右到左缓慢漂移 emoji 🍾 (3-5 只随机)

2. 场景传送门点击进入详情:
   - 新建 pages/scene/scene.uvue，传 sceneId 参数
   - 进入后顶部大图 + 该场景的歌单（按 mood 过滤 playlist）
   - 返回时整页 mood 恢复

3. 搜索真做:
   - input 接 @input，实时过滤 playlist
   - 显示在 scene portals 下方"搜索结果"区
   - 空查询时显示推荐（按时段：早上 → sea-salt mood 的歌）

完成后发现页从"展览" → "可探索的空间"。
```

---

## 执行建议

**最少可交付路径**：Phase 1 + Phase 6 (前者让 App "真"，后者让 App "诚实"，两步即可对外 demo)
**完整体验路径**：1 → 2 → 3 → 4 → 5 → 6 → 7 (跳过 8/9 节奏更紧凑)
**展示型项目（课程作业 / portfolio）路径**：5 → 6 → 4 → 8 (强化视觉与流畅度，不强求真音频)

每完成一个 Phase 跑一次编译，按错误修正再继续。所有错误模式见本文件顶部约束清单。
