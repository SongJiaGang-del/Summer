# 夏日律动 · 二轮打磨分步执行 Prompt（Phase H–N）

> 配套 AUDIT_v2.md 使用
> 执行前请确保已读完 Prompt2.md 末尾"项目通用约束"

---

## ⚠️ 项目通用约束（每个 Phase 都带上）

```
项目：uni-app x (uvue + uts native rendering)，Android 真机。
强约束：
1. 纯前端 + 本地存储（uni.setStorageSync）。无后端、无账号。
2. 不使用任何 emoji 字符作为图标/装饰/状态指示。所有图标改用内联 SVG，
   统一放在 components/icons/ 目录，每个图标一个 .uvue 组件，
   接受 size: Number、color: String（默认 currentColor）两个 props。
3. uts 严格类型：reactive/ref/对象字面量 必须显式命名类型；
   不允许内联对象类型（如 reactive<{ a: number }>）。
4. v-for 数据结构里不能嵌套 Ref<T>，用"平行数组"模式。
5. 结构化 JSON 反序列化必须用 JSON.parse<T> / JSON.parseArray<T>，
   不允许 JSON.parse(x) as T 假转型。
6. 跨组件 type 共享，从同一个 .uts 源 import。
7. 不可用：@keyframes from/to、offsetLeft、字符串下标返回 String、
   uni.upx2px（用 utils/responsive.uts 的 rpx2px 代替）。
8. 完成每个 Phase 立刻跑一次 Hbuilder X 编译，按报错对照约束修。
```

---

## Phase H — 图标系统 Canvas 自绘（P0，最高优先级）⭐

> **方案选择**：本项目采用 Plan C（uts canvas 程序化自绘）。
> 优点：零外部资源、颜色尺寸完全 props 控制、跟随主题色无需切 src。
> 代价：实现工作量最大（每图标手写绘制函数），首次实现耗时长但可复用。



### 目标
全工程禁用 emoji，所有图标改为 uts 程序化 canvas 自绘，统一线条风格 + 颜色 props 完全可控。

### 技术方案：Plan C — Canvas Path 自绘

每个图标 = 一个 `.uvue` 组件 + 一段 uts 绘制函数。在 `<canvas>` 上调用
`moveTo / lineTo / arc / quadraticCurveTo / bezierCurveTo` 绘制 path。
**不需要任何外部资源文件**，颜色 / 粗细 / 尺寸全部 props 控制，
mood 切换主题色时只需把 color prop 重新绑定即可。

### 通用组件骨架（所有图标共用）

```vue
<template>
  <canvas
    :id="canvasId"
    :canvas-id="canvasId"
    :style="canvasStyle"
    type="2d">
  </canvas>
</template>

<script setup lang="uts">
  import { onMounted, watch, computed } from 'vue'

  const props = defineProps({
    size: { type: Number, default: 24 },         // px
    color: { type: String, default: '#1B4965' },
    strokeWidth: { type: Number, default: 2 },
    filled: { type: Boolean, default: false }     // 实心 or 线条
  })

  // canvas-id 必须全局唯一：组件名 + 递增计数器
  let __iconCounter = 0
  const canvasId = 'icon-XXX-' + (++__iconCounter)

  const canvasStyle = computed<string>(() : string =>
    'width:' + props.size + 'px;height:' + props.size + 'px;'
  )

  function draw() {
    const ctx = uni.createCanvasContext(canvasId)
    // 清空
    ctx.clearRect(0, 0, props.size, props.size)
    // 通用绘制参数
    ctx.setStrokeStyle(props.color)
    ctx.setFillStyle(props.color)
    ctx.setLineWidth(props.strokeWidth)
    ctx.setLineCap('round')
    ctx.setLineJoin('round')

    // —— 这里按图标自己绘制 path ——
    // 所有坐标基于 24×24 viewBox，再按 size/24 缩放
    const s = props.size / 24
    drawIconPath(ctx, s)

    if (props.filled) ctx.fill()
    else ctx.stroke()
    ctx.draw()
  }

  function drawIconPath(ctx : any, s : number) {
    // —— 每个图标组件重写这里 ——
  }

  onMounted(() => { draw() })
  watch(() : string => props.color + '|' + props.size + '|' + props.strokeWidth, () => { draw() })
</script>
```

### Prompt

```
项目 Summer 图标系统 Plan C 实现：

1. 新建 components/icons/ 目录，每个图标一个 .uvue 文件，
   按上面的"通用骨架"实现。

2. canvas-id 唯一性：每个图标组件用文件名作前缀，加内部递增计数器
   （多次实例化同一图标也要拿到不同 canvas-id，否则同页面多个相同图标会冲突）。

3. 必须做的 21 个图标 + 它们的 path 坐标参考（基于 24×24 viewBox）：

   ★ 播放控件
   - icon-play       三角形 (6,4)→(20,12)→(6,20) 闭合
   - icon-pause      两个圆角矩形 (6,4,4,16) (14,4,4,16)
   - icon-prev       竖线 (6,4)→(6,20) + 三角 (20,4)→(8,12)→(20,20)
   - icon-next       三角 (4,4)→(16,12)→(4,20) + 竖线 (18,4)→(18,20)

   ★ 导航 (bottom-nav)
   - icon-music-note  圆角八分音符（路径自行设计，参考 Feather music icon）
   - icon-sparkle     四角星，从 (12,2)→(14,10)→(22,12)→(14,14)→(12,22)→(10,14)→(2,12)→(10,10)
   - icon-island      同心圆三层 + 一棵简笔椰树

   ★ mood 图标 (mood-selector + app-header)
   - icon-wave        三段正弦波 quadraticCurveTo
   - icon-strawberry  心形 + 顶部锯齿叶子（实心 filled=true）
   - icon-mint        两片叶子对称，中心叶脉

   ★ 白噪音 (mixer-drawer)
   - icon-sun         圆 + 8 条射线
   - icon-rain        云朵（两个圆 + 下边缘）+ 3 条斜线雨滴
   - icon-bell-off    铃铛轮廓 + 对角斜线划掉

   ★ 其他
   - icon-bottle      细长瓶身（瓶颈梯形 + 瓶身圆角矩形）
   - icon-confetti    随机散布 6-8 个小四边形（用固定 seed 保证一致）
   - icon-check       √ (4,12)→(10,18)→(20,6)
   - icon-cross       × (6,6)→(18,18) + (18,6)→(6,18)
   - icon-gear        齿轮（8 齿，外圈半径 10、内圈半径 7、中心圆 4）
   - icon-search      圆 (10,10,r=6) + 把手 (14.5,14.5)→(20,20)
   - icon-question    "?" 路径，顶部弧 + 中段竖线 + 底部点
   - icon-image-broken 矩形外框 + 山形折线 + 对角划线（fallback 占位用）

4. 全文替换所有 emoji 字面量：
   搜索清单：♪ ✦ ⌘ 🌊 🍓 🍃 ☀ ☂ 🔕 🍾 🎉 ✓ ✗ ⚙ 🔍 ▶ ⏸ ⏮ ⏭ ?
   逐个替换为对应 <icon-xxx :size="N" :color="..."> 组件。
   注意 ? 是问号字符，仅在 help-btn 那一处替换为 icon-question。

5. 数据层适配：
   - store/player.uts 的 moods[i].icon 字段从 emoji 字符串
     改为 iconName: string（如 'wave' / 'strawberry' / 'mint'）
   - mood-selector 根据 iconName 用 v-if 选择渲染哪个 icon 组件
     （uts 不支持动态组件 :is，只能 v-if 链）
   - navs[i].icon 同理改 iconName

6. 性能与已知坑：
   a. uni.createCanvasContext 在 uvue 里**仅 onMounted 后可用**。
      多个 canvas 同一帧初始化时，ctx.draw() 必须各自调用一次。
   b. 不要在 v-for 的 :key 里用 canvasId（会让 Vue 误判重渲染）。
   c. 同页面如果有 50+ icon 实例（不太可能），观察 fps，
      必要时把 icon-wave 这种静态图标缓存渲染结果。
   d. 颜色变化重绘要节流：watch 用 computed 拼 key 而不是逐个 watch，
      避免 size+color 同帧变化触发两次 draw。
   e. 描边图标 props.filled=false 用 stroke()；
      实心图标如 strawberry / confetti 用 filled=true → fill()。

7. SVG path 统一视觉规范：
   - viewBox 概念上 24×24（实际按 props.size 缩放）
   - 默认 strokeWidth: 2
   - setLineCap('round') + setLineJoin('round')
   - 默认 color: '#1B4965'（项目主色），mood 场景用 mood.color 覆盖

完成后跑编译。逐个图标真机自检：
   - bottom-nav 3 个 icon 渲染正常
   - mood-selector 3 个 icon 切换正常
   - mini-player play/pause 按钮切换状态时 icon 平滑切换
   - mixer-drawer 3 个 ambient icon 渲染
```

---

## Phase I — 占位曲清理 + 原创氛围词（P0）⭐

### 目标
清理虚假数据 + 充实歌词区。

### Prompt

```
项目 Summer 内容真实化：

1. 删除 playlist 中 12 首 SoundHelix 远程示例曲（audioUrl 含 soundhelix.com 的所有条目）。
   playlist 只保留 10 首本地 CC0（loyalty-freak-music-*.mp3）。

2. 为这 10 首每首创作 5 行原创氛围短句作为 lyrics 字段值。
   要求：
   - 每行 8-14 字
   - 风格扣应曲名（如 Summer Pride 偏热烈、Traveling in Your Mind 偏梦境）
   - 不引用任何流行歌曲歌词，全部原创
   - 在 lyrics-scroll 组件顶部已有"♪ App 原创氛围词"角标，无需新增

3. 检查 store/player.uts 的 fallbackSong 占位歌曲，
   它的 lyrics 改成 ['等一首歌漂过来', '夏天还很长', '夏夜会有答案']。

4. 检查 scene 页和发现页：
   - 删除占位曲后，sceneSongs 计算逻辑确保 length=0 时回退到 playlist 不会显示空白
   - 发现页 displaySongs 默认推荐数量从 12 调整到 6（playlist 缩水后）

完成后跑编译并打开真机测试 3 首歌的歌词渲染。
```

---

## Phase J — 律动页交互修复（P0/P1 合并）⭐

### 目标
解决 mini-player 缺进度、律动页缺切歌、黑胶手势冲突 4 个相关问题。

### Prompt

```
项目 Summer 律动页交互打磨：

1. mini-player（components/mini-player/mini-player.uvue）：
   - glass-panel 顶部叠加 2px 细进度条（colorbar），用 props progress: Number
     从 0-100 控制宽度
   - 整个 glass-panel 加 @click="$emit('expand')"
   - 注意：内部 play-btn / ctl 按钮要 @click.stop 阻止冒泡
   - 颜色：进度条用 dominantMood 颜色（接 store dominantMoodId）
   - 在 pages/index/index.uvue 监听 @expand → state.activePageIndex = 0

2. 律动页（pages/index/index.uvue）页 1：
   - 删除外层 <scroll-view scroll-y>，改成普通 <view>
     （律动页内容总高度按屏幕 fit 设计，不需要滚动）
   - 黑胶左侧、右侧各加一个圆形半透明按钮，
     位置 absolute，垂直居中，左右各 16rpx 外侧
     使用 icon-prev / icon-next（H 阶段产出的 SVG 组件）
     @click 触发 onPrev / onNext

3. 黑胶单击判定（onVinylTouchStart/Move/End）：
   - touchstart 记录 startX、startY、startTime
   - touchend 判定：
     const dx = endX - startX
     const dy = endY - startY
     const dt = now - startTime
     const isTap = Math.abs(dx) < 6 && Math.abs(dy) < 6 && dt < 200
     只有 isTap 才 emit('toggle')，否则不触发
   - 上下滑保留：纵向 |dy| > 30 且 |dy| > |dx| 时进入音量调节
   - 左右滑可选：横向 |dx| > 60 且 |dx| > |dy| 时切歌

4. progress-bar 拖拽期间在父级加锁：
   - dragstart 触发 state.isSeeking = true
   - dragend 触发 state.isSeeking = false
   - 父 scroll-view（如还有）watch isSeeking 控制 :scroll-y="!state.isSeeking"

完成后跑编译并真机测试：
   - 黑胶轻颤是否还会误触发 toggle
   - mini-player 点击是否能跳回律动页
   - 黑胶左右切歌是否流畅
```

---

## Phase K — 首次引导节奏调整（P1）

### Prompt

```
项目 Summer 首次引导改造：

1. 移除 onMounted 里 splash 之后 2s 弹 guide 的逻辑（pages/index/index.uvue:462 附近）。

2. 改为：在 onVinylTouchEnd 里检查
   if (loadStr(K.GESTURE_SEEN, '') != '1' && firstTapJustHappened) {
     setTimeout(() => { showGuide.value = true }, 600)
   }

3. guide modal 改成 3 步分步演示：
   - 第 1 步：演示单击播放（带高亮黑胶轮廓）
   - 第 2 步：演示上下滑调音量（带动画箭头）
   - 第 3 步：演示左右切歌（带动画箭头）
   - 用户可"跳过 / 下一步"切换
   - 完成后写入 K.GESTURE_SEEN = '1'

4. guide modal 视觉：mask 黑色半透 60%，中央卡片白色，
   顶部进度点 ●○○ → ○●○ → ○○●

完成后跑编译。
```

---

## Phase L — 个性化深度（P2）

### 目标
让"音乐画像"真正个性化。

### Prompt

```
项目 Summer 画像与场景深化：

1. playerStats 新增字段：
   type PlayerStats = {
     totalPlaySeconds : number,
     moodCounts : MoodCount[],
     uniqueSongs : number[],
     hourlyCounts : number[],     // 24 个槽位，每个 hour 的累计秒数
     songPlayCount : number[]     // 与 playlist 等长，每首播放次数
   }
   makeDefaultStats 同步加默认值，accumulatePlay 时按 new Date().getHours()
   更新 hourlyCounts[hour] += seconds、songPlayCount[idx] += 1。

2. 小岛页画像板块新增 3 张卡片：
   - 「最常听的时段」：按 hourlyCounts 找 max，显示 18:00-20:00 范围
   - 「单曲循环 Top3」：按 songPlayCount 降序取 3 首，列出 title + 次数
   - 「夏日精神动物」：按 [dominantMood, peakHour] 组合查表给 9 种标签
     如 (sea-salt, 早晨) → "海面初醒的鸥"
        (strawberry, 黄昏) → "黄昏的火烈鸟"
        (mint, 深夜) → "雨林夜歌的萤"
     标签卡用全屏渐变背景 + 大字体动物名 + 一句话描述

3. 场景重做（store/player.uts categories）：
   - 改类型为 SceneTemplate：
     type SceneTemplate = {
       id : string,
       name : string,
       narrative : string,       // 一句话叙事
       suggestedHour : string,   // '03:00' 等
       cover : string,
       fallbackImage : string,
       songIndices : number[]    // 直接挂歌 idx，不再用 moodId 过滤
     }
   - 写 5 个场景：
     A. 凌晨 3 点的便利店（03:00）
     B. 七月最后一场雷雨（17:00）
     C. 海岸线最后一班 K3 列车（19:00）
     D. 雨林清晨的瀑布池（07:00）
     E. 仲夏夜泳池（22:30）
   - 每个手挑 3-5 首歌（playlist 缩水到 10 首后从中选）
   - scene 页 hero 区加场景叙事文案 + 时段图示

完成后跑编译。
```

---

## Phase M — 等级 / 称号 / 漂流瓶（P2）

### Prompt

```
项目 Summer 系统深化：

1. 等级阈值改造（store/player.uts levelFromSeconds）：
   const levelThresholds = [0, 1800, 5400, 12600, 19800, ...]
        // LV1 起步 / 30min / 1h30 / 3h30 / 5h30 / 之后每级 +1h
   levelFromSeconds(sec) 改成查阈值数组找 i + 1。

2. 称号融合 dominantMood（titleForLevel(lv, moodId)）：
   返回如 "日落派 · LV3 · 黄昏巡游者"
   预定义 mood × level 矩阵（3 mood × 9 等级 = 27 条文案）。

3. 漂流瓶扩内容：
   - bottles 默认 4 条 → 15 条预置虚构留言
   - 加 replies : string[] 已有，现在打开瓶子可以追加回复
     bottle-modal 弹层增加"回复 input + 提交按钮"
     提交后 push 到 bottle.replies，saveBottles
   - 列表里显示 v-if="b.replies.length > 0" 徽标
     "{{ b.replies.length }} 条回复"

完成后跑编译。
```

---

## Phase N — 工程债（P3，答辩后做）

### Prompt

```
项目 Summer 工程债清理：

1. 拆 store/player.uts 到多个模块：
   - store/playlist.uts （Song type + playlist + currentSong + nav）
   - store/audio.uts    （InnerAudioContext + togglePlay + seekTo + setVolume）
   - store/bottles.uts
   - store/stats.uts    （playerStats + level + DNA + report）
   - store/ambients.uts
   - store/mood.uts     （MoodId + moods + setMood）
   - store/index.uts    （re-export）

2. utils/storage.uts 重写：
   - 删除 loadJson<T>
   - 新增 loadObject<T>(key, fallback) : T
     内部 try { return JSON.parse<T>(raw) ?? fallback } catch { return fallback }
   - 新增 loadArray<T>(key, fallback) : T[]
     内部 JSON.parseArray<T>(raw)
   - 全工程替换调用点

3. utils/tween.uts 接入 ticker：
   删除自有 setInterval，step 函数注册到 utils/ticker.uts 的 onFrame

4. pages.json：
   开发期保留 pages/dev/selftest 路由；
   生产期通过 "condition" 字段或编译插件排除。

完成后跑编译。
```

---

## 执行顺序建议

```
答辩前必做（耗时 ~12h）：
  H 图标 SVG 化           5h  ← 这一轮最重，先做
  I 占位曲清理 + 氛围词    2h
  J 律动页交互修复         2h
  K 首次引导节奏           0.5h
  L 个性化深度（前 2 项）  3h

答辩亮点：
  L 第 3 项场景叙事化      2h
  M 等级 + 漂流瓶          3h

答辩后再做：
  N 工程债清理             5h
```

每完成一个 Phase 跑一次编译，按"项目通用约束"对照修错。

