# 夏日律动 · 深度体验缺陷报告 v2

> 一份基于真实使用 + 全代码翻读后的吐槽清单
> 撰写时间：2026-06-07
> 适用阶段：Phase A–G 全部完成后的二轮打磨

---

## 通用约束（每个修复任务都要遵守）

1. **uni-app x (uvue/uts) 项目**，纯前端 + 本地存储，无后端，无账号
2. **不得使用 emoji 字符作为图标**——所有图标、装饰符号、状态指示都必须改为内联 SVG（`<svg viewBox="...">...</svg>`），统一存放在 `components/icons/` 下作为可复用组件
3. uts 严格类型：所有 `reactive/ref/object 字面量`必须显式命名类型
4. v-for 的数据结构里不能嵌套 `Ref<T>`（用"平行数组"模式）
5. 跨组件传递 type，从同一个 `.uts` 源 import
6. uts 不支持内联对象类型、`@keyframes from/to`、`offsetLeft`、字符串下标返回 String
7. JSON 反序列化结构化类型必须用 `JSON.parse<T>` / `JSON.parseArray<T>`，禁止 `JSON.parse(x) as T` 假转型
8. 所有图标 SVG 颜色用 `currentColor` 或 props 控制，便于跟随 mood 主题色变化

---

## 紧迫度图例

| 标签 | 含义 |
|------|------|
| 🔴 P0 | 用户一眼能看出来的"半成品感"，必须修 |
| 🟠 P1 | 交互冲突 / 手势误触，影响日常使用 |
| 🟡 P2 | 个性化深度不足，影响产品立意 |
| 🟢 P3 | 代码 / 工程债，不影响演示但影响后续维护 |

---

## 🔴 P0 — 半成品感

### #1 12 首 SoundHelix 远程占位曲混在 playlist 里
**症状**：歌名「夏日清风」+ 海景封面，连到 `SoundHelix-Song-1.mp3` 这种纯电子示范曲；评委随机点开和气质完全对不上。
**根因**：playlist 早期用 SoundHelix 仅作播放联调，后续没清理。
**解决**：
- 方案 A（推荐）：删除 12 首远程占位，playlist 只留 10 首本地 CC0
- 方案 B：把 12 首歌名/封面统一改为"示例曲 A / B / C"，封面换抽象渐变色块，duration 显示"--:--"
**影响文件**：`store/player.uts`、`pages/scene/scene.uvue`

---

### #2 10 首本地 CC0 全部 `lyrics = ['纯音乐，请欣赏']`
**症状**：律动页歌词区永远只有一行字，黑胶转着歌词区静止——看起来像 bug。
**根因**：CC0 曲目无原歌词，怕版权风险全部用占位。
**解决**：
- 为每首本地曲创作 4-6 行原创氛围短句（属于项目方著作权）
- 在歌词区右上角加"♪ App 原创氛围词，非原曲歌词"角标（已有，复用）
**影响文件**：`store/player.uts`

---

### #3 mini-player 没有进度条 / 不能点击展开
**症状**：切到发现 / 小岛页后，底部 mini-player 只显示 title+按钮，不知道当前位置；想回律动页要先点 bottom-nav。
**根因**：mini-player 设计阶段当装饰条用。
**解决**：
- mini-player 顶部加 2px 细进度条（颜色跟 mood 主题）
- glass-panel 外层加 `@click` → `state.activePageIndex = 0`
- 区分子按钮 / panel 点击：prev/next/toggle 阻止冒泡
**影响文件**：`components/mini-player/mini-player.uvue`、`pages/index/index.uvue`

---

### #4 律动页没有"上一曲/下一曲"快捷入口
**症状**：律动页要切歌必须低头找底部 mini-player，眼睛在大区域和小区域反复跳。
**根因**：黑胶占据视觉中心，prev/next 设计阶段只放在 mini-player。
**解决**：
- 黑胶左右各加一个半透明圆按钮（SVG 三角图标）
- 按钮位置：黑胶左右各 24rpx 外侧，垂直居中
- 或：黑胶左右滑（dx > 60）→ prev/next
**影响文件**：`components/vinyl-disc/vinyl-disc.uvue`（左右滑）或 `pages/index/index.uvue`（外置按钮）

---

## 🟠 P1 — 手势冲突

### #5 黑胶上下滑音量 vs 律动页 scroll-y 冲突
**症状**：黑胶上滑调音量，手指稍斜就被父 scroll-y 截走，命中率不稳。
**根因**：律动页用 `<scroll-view scroll-y>` 包裹整体，黑胶 `@touchmove` 优先级低于 scroll-view。
**解决**：
- 律动页**不要**用 scroll-view 包整体（律动页内容总高度可设计为 fit-screen，不需要滚动）
- 改用普通 `<view>` 容器，黑胶手势就不被截
- 或：保留 scroll-y，在 vinyl-touch 区域 `@touchmove` 内手动判断方向，dy > 8 时触发音量调节
**影响文件**：`pages/index/index.uvue`

---

### #6 进度条拖拽期间没阻止纵向滚动
**症状**：拖进度横向移动时，纵向稍偏触发整页 scroll。
**解决**：progress-bar 内部 `@touchmove` 期间用 `state.isSeeking` 标志锁定父 scroll，松手解锁。
**影响文件**：`components/progress-bar/progress-bar.uvue`、`pages/index/index.uvue`

---

### #7 黑胶单击 toggle 阈值不明
**症状**：手指轻颤触发误暂停。
**解决**：明确判定 `dy < 6 && dx < 6 && duration < 200ms` 才算 click，否则不触发 toggle。
**影响文件**：`pages/index/index.uvue`（onVinylTouchEnd）

---

### #8 splash + guide 连续弹两层
**症状**：splash 淡出后 2s 立刻弹 4 步教学，用户刚看完动画就被拦截。
**解决**：
- splash 跳过后不立刻弹 guide
- 等用户首次点击黑胶（不论暂停还是播放）后再弹 guide
- guide 多加"分 3 步演示，第一步只讲'单击播放'"分步引导
**影响文件**：`pages/index/index.uvue`、`components/splash-screen/splash-screen.uvue`

---

## 🟡 P2 — 个性化伪深度

### #9 vibeDnasComputed 只算 mood 时长占比，不算"画像"
**症状**：用户听 100 首歌，画像也只有 3 条 mood 占比。
**解决（无后端，纯本地统计）**：
- `playerStats` 增维：`hourlyCounts: { [hour: number]: number }`、`songPlayCount: { [songIndex: number]: number }`
- 画像板块加 3 张卡：
  - 「最常听的时段」: 18:00-20:00（按 hourlyCounts 算）
  - 「单曲循环 Top3」: 列出最高的 3 首
  - 「夏日精神动物」: 按"主导 mood + 时段"组合出 9 种标签（如"黄昏的鲸鱼"= sunset+18-20）
**影响文件**：`store/player.uts`、`pages/index/index.uvue`

---

### #10 场景传送门 = mood 换名字
**症状**：3 个场景严格对应 3 个 mood，进去就是按 mood 过滤 playlist，无场景价值。
**解决**：
- 引入 `type SceneTemplate = { id, name, narrative, suggestedHour, songIndices: number[] }`
- 写 5-6 个叙事化场景：「凌晨 3 点的便利店」「七月最后一场雷雨」「海岸线最后一班 K3 列车」
- 每个场景**手挑** 3-5 首歌（与 mood 解耦）
- scene 页 hero 区域加场景叙事文案 + 时段图示（SVG）
**影响文件**：`store/player.uts`、`pages/scene/scene.uvue`

---

### #11 等级升级过快、称号空洞
**症状**：600 秒（10 分钟）一级，一首歌升 2-3 级；称号纯按等级硬切，不结合用户偏好。
**解决**：
- 阈值改成：LV1→2: 30min；LV2→3: 1h；LV3→4: 2h；之后每级 +1.5h
- 称号融合 `dominantMoodId`：`titleForLevel(lv, dominantMood)` 返回如"日落派 · LV3 · 黄昏巡游者"
**影响文件**：`store/player.uts`（levelFromSeconds、titleForLevel）

---

### #12 漂流瓶永远只有自己写的
**症状**：本地存储，只能看见自己历史投瓶，无社交感。
**解决**（无后端）：
- 默认 4 条扩到 15 条，全部预置"虚构他人留言"
- 加 `replyTo: number | null` 字段，打开瓶子可写匿名回复，回复也存本地
- 列表里显示「3 条回复」徽标
**影响文件**：`store/player.uts`、`components/bottle-modal/bottle-modal.uvue`

---

## 🟢 P3 — 工程债

### #13 store/player.uts 单文件 1000 行
**解决**：拆分
- `store/playlist.uts`（Song type + playlist + currentSong）
- `store/audio.uts`（InnerAudioContext + 控制）
- `store/bottles.uts`
- `store/stats.uts`（playerStats + 等级 + DNA）
- `store/ambients.uts`
- `store/index.uts`（re-export 入口）

---

### #14 mood id 字符串散落各处
**解决**：抽 `utils/mood.uts`，集中 `type MoodId`、`isMoodId(s)`、`moodLabelOf(id)`、`moodColorOf(id)`、`moodIconSvgOf(id)`。

---

### #15 `loadJson<T>` fake cast 隐患
**解决**：
- 删除 `loadJson<T>`
- 新增 `loadObject<T>(key, fallback): T`（内部 `JSON.parse<T>`）
- 新增 `loadArray<T>(key, fallback): T[]`（内部 `JSON.parseArray<T>`）
- 全工程替换调用点
**影响文件**：`utils/storage.uts`、`store/*`

---

### #16 中心 ticker 没真正吃掉 tween 引擎
**解决**：`utils/tween.uts` 内部的 setInterval 改成 `onFrame()` 注册一个 step cb；删除自有 ticker。

---

### #17 selftest 页用户可直达
**解决**：编译期通过 `process.env.NODE_ENV !== 'production'` 在 pages.json 里排除（uni-app x 支持 condition 编译）；或运行时 `__DEV__` 判断重定向。

---

### #18 存档导出走剪贴板
**解决**：
- 导出生成二维码（用 uts-qr 库或 canvas 自绘）
- 扫码即导入
- 同时保留剪贴板作为兜底

---

## ⭐ 新增 P0 — 图标系统重做

### #19 全工程禁用 emoji，统一改内联 SVG
**症状**：当前 emoji 散落各处：
- bottom-nav: `♪ ✦ ⌘`
- mood: `🌊 🍓 🍃`
- app-header: `🔕`（mixer 按钮）
- mixer ambients: `🌊 ☀ ☂`
- bottles: `🍾`
- splash: `🎉`
- summer-report: emoji 装饰
- selftest: `✓ ✗ ⚙`
- 各页 fallback: `🌊`

**问题**：
- 不同 Android 设备 emoji 字体不一，视觉风格断裂
- 颜色无法跟随 mood 主题色
- 答辩演示设备如果是低端机，emoji 可能渲染成空格 / □

**解决**（采用 Plan C：uts canvas 程序化自绘）：
1. 新建 `components/icons/` 目录，每个图标做成独立 `.uvue` 组件
2. 每个图标组件内部用 `<canvas>` + uts 绘制 path（moveTo/lineTo/arc/bezierCurveTo）
3. 统一 props：
   ```uts
   defineProps({
     size: { type: Number, default: 24 },   // px
     color: { type: String, default: '#1B4965' },
     strokeWidth: { type: Number, default: 2 }
   })
   ```
4. canvas 渲染在 onMounted 里执行一次，props 变化 watch 重绘
5. 颜色完全可控，跟随 mood 主题色变化无需多套资源
6. 至少需要这些组件（按当前用法）：
   - `icon-music-note.uvue`（替换 ♪）
   - `icon-sparkle.uvue`（替换 ✦）
   - `icon-island.uvue`（替换 ⌘）
   - `icon-wave.uvue`（替换 🌊）
   - `icon-strawberry.uvue`（替换 🍓）
   - `icon-mint.uvue`（替换 🍃）
   - `icon-sun.uvue`（替换 ☀）
   - `icon-rain.uvue`（替换 ☂）
   - `icon-bell-off.uvue`（替换 🔕）
   - `icon-bottle.uvue`（替换 🍾）
   - `icon-confetti.uvue`（替换 🎉）
   - `icon-check.uvue` / `icon-cross.uvue`（替换 ✓ ✗）
   - `icon-gear.uvue`（替换 ⚙）
   - `icon-search.uvue`（替换 🔍）
   - `icon-play.uvue` / `icon-pause.uvue` / `icon-prev.uvue` / `icon-next.uvue`（替换 ▶ ⏸ ⏮ ⏭）
   - `icon-question.uvue`（替换 ?）
3. SVG path 全部使用单一线条风格（line / outline 风格统一），stroke-width: 2，stroke-linecap: round
4. 颜色用 `currentColor`，由父组件的 css `color:` 或 props 控制
5. 删除所有 emoji 字符串字面量；fallback "图片加载失败"也改用 icon-image-broken
6. **影响范围**：几乎所有 .uvue 组件 + 部分 pages

**紧迫度**：⭐⭐⭐⭐⭐（这一条单独算 P0）

---

## 优先级矩阵

```
高影响 + 低成本（先做）：
  #1  删 / 改占位曲          1h
  #3  mini-player 进度线+点击 1.5h
  #5  黑胶 scroll 不嵌套       1h
  #7  黑胶单击阈值             0.5h
  #8  guide 延迟到首次点击     0.5h

高影响 + 中成本（答辩前必做）：
  #2  10 首原创氛围词          2h
  #4  黑胶左右切歌按钮         1.5h
  #9  画像加时段维度           3h
  #10 场景叙事化重做           3h
  #19 全图标改 SVG             5h  ← 新增，工作量最大

中影响 + 高成本：
  #11 等级阈值+融合称号        2h
  #12 漂流瓶预置假留言+回复    4h

工程债（答辩后再做）：
  #13 拆 store                 3h
  #14 mood 工具集中            1.5h
  #15 loadJson 重写            1.5h
  #16 tween 接入中心 ticker    1h
  #17 selftest 编译排除        0.5h
  #18 存档二维码导出           2h
```

总工作量预估：**33h**

