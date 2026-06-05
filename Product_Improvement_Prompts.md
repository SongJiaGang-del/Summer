# 夏日律动 - 产品缺陷分步完善 Prompt 手册

> 本文档根据当前项目走查结果编写，目标是把“氛围型 Demo”逐步完善成“可真实使用、可持续维护、可形成留存闭环”的音乐陪伴产品。
>
> 每个阶段都是一个独立可执行的 prompt，可复制给 Claude / Cursor / Codex 单独执行。建议严格按优先级推进：先补真实能力，再补个性化闭环，最后收敛设计系统和动效细节。

---

## 项目通用约束

每次执行下面任一 Prompt 时，都应带上这些约束：

```
项目 Summer 是 uni-app x 项目，技术栈为 uvue + uts，不是普通 uni-app。

必须遵守：
1. 不使用 DOM API，不使用 offsetLeft / offsetWidth；需要测量元素时使用 ref<UniElement> + getBoundingClientRect()。
2. uts 类型严格，对象、数组、props、storage JSON 数据尽量使用命名 type，不使用复杂内联对象类型。
3. 跨组件传递数组 prop 时，类型从同一个 .uts 文件 import，避免 UTSJSONObject cast 问题。
4. 字符串不要用 s[0] 拼接，使用 substring()。
5. 动画使用 utils/tween.uts + composables/use-anim.uts 里的 tweenRef / tweenColor，不写 CSS keyframes。
6. 不引入 DOM 依赖库；如需新增工具函数，优先写 uts。
7. 修改后尽量运行项目可用的编译或至少做静态代码检查，修复 uts 类型错误。
8. 不要覆盖用户已有业务数据，storage key 增量新增，并做好 fallback。
```

当前项目关键文件：

- 主页面：[pages/index/index.uvue](pages/index/index.uvue)
- 播放器与业务状态：[store/player.uts](store/player.uts)
- 黑胶组件：[components/vinyl-disc/vinyl-disc.uvue](components/vinyl-disc/vinyl-disc.uvue)
- 进度条：[components/progress-bar/progress-bar.uvue](components/progress-bar/progress-bar.uvue)
- 混音器：[components/mixer-drawer/mixer-drawer.uvue](components/mixer-drawer/mixer-drawer.uvue)
- 漂流瓶弹窗：[components/bottle-modal/bottle-modal.uvue](components/bottle-modal/bottle-modal.uvue)
- 设计 token：[utils/tokens.uts](utils/tokens.uts)

---

## Phase 1 - 发现页搜索真功能化（P0）

### 目标

把发现页顶部“寻找你的夏日主打歌...”从静态假入口改成真实搜索。用户输入关键词后，可以按歌曲名、歌手名即时过滤歌单，并能直接播放搜索结果。

### Prompt

```
为 Summer 项目的发现页实现真实搜索功能。

现状：
- pages/index/index.uvue 发现页顶部只有 view.search + search-placeholder，没有 input。
- 每日精选直接 v-for playlist，没有搜索结果状态。

请完成：

1. 在 pages/index/index.uvue 中新增搜索状态：
   - const searchKeyword = ref('')
   - const filteredSongs = computed<Song[]>(...)
   - 匹配字段包括 song.title 和 song.artist。
   - 搜索大小写不敏感；中文直接 includes。

2. 把发现页 search 区域改成真实 input：
   - 保留原有玻璃拟态视觉。
   - input 使用 @input 同步 searchKeyword。
   - placeholder 为“寻找你的夏日主打歌...”。
   - 输入非空时显示清除按钮，点击清空。

3. 发现页内容逻辑：
   - searchKeyword 为空：显示“每日精选”，内容为全部 playlist。
   - searchKeyword 非空且有结果：标题显示“搜索结果”，只展示 filteredSongs。
   - searchKeyword 非空且无结果：显示空状态文案“这片海域还没有这首歌”。

4. 点击搜索结果播放：
   - 因 filteredSongs 是 Song[]，播放时需要找到它在 playlist 中的原始 index。
   - 点击后调用 playSong(originalIndex)，并切回律动页。

5. 类型要求：
   - 从 store/player.uts import type Song。
   - 不要使用 any。

验收：
- 输入“清风”只显示《夏日清风》。
- 输入歌手名也能匹配。
- 清空输入后恢复每日精选。
- 点击搜索结果能播放正确歌曲。
```

---

## Phase 2 - 场景传送门从“闪一下”升级为真实场景歌单（P0）

### 目标

当前场景传送门只切换 mood 并闪白，没有进入新的内容空间。要让“传送门”有真实去处：点击场景后进入场景详情页，展示场景封面、介绍、匹配歌单，并支持播放。

### Prompt

```
为 Summer 项目实现真实场景传送门详情页。

现状：
- components/scene-card/scene-card.uvue 文案为“进入传送门”。
- pages/index/index.uvue 的 onEnterPortal(moodId) 只 setMood + flash，没有进入详情页。
- pages.json 目前只有 pages/index/index。

请完成：

1. 扩展 store/player.uts 的 Category 类型：
   - 增加 id: string
   - 增加 desc: string
   - 保留 name / image / moodId
   - 为现有 categories 补 id 和 desc。

2. 新建页面 pages/scene/scene.uvue：
   - 接收 sceneId 参数。
   - 根据 sceneId 从 categories 找到当前场景。
   - 顶部展示大图、场景名、描述。
   - 下方展示该 moodId 匹配的歌单。
   - 当前 playlist 暂无 mood 字段时，先采用保守方案：
     - sea-salt 显示全部偏海边主题歌曲；
     - mint / strawberry 可先按 title 或 index 做临时映射，但要封装成 getSongsForScene(scene) 函数，方便后续改为真实 mood 字段。

3. 修改 pages.json：
   - 注册 pages/scene/scene。
   - navigationStyle 保持 custom 或按项目风格设置。

4. 修改 scene-card：
   - 文案从“进入传送门”改为“查看歌单”。

5. 修改 pages/index/index.uvue：
   - onEnterPortal(categoryId) 调用 uni.navigateTo({ url: '/pages/scene/scene?sceneId=' + categoryId })。
   - 进入前仍可 setMood(category.moodId) 和播放 flash 动画，但不要只停留在当前页。

6. 交互要求：
   - 场景详情页点击歌曲后调用 playSong(index)，并返回或跳转到首页律动页。
   - 找不到 sceneId 时显示友好 fallback，不白屏。

验收：
- 点击“沙滩派对”进入场景详情页。
- 详情页能看到该场景图、描述、歌单。
- 点击歌曲能播放。
- 找不到 sceneId 不崩溃。
```

---

## Phase 3 - 白噪音混音器接入真实环境音（P0）

### 目标

当前 AMBIENT MIXER 只切换开关，没有声音。要让海浪、夏蝉、微雨成为真正可叠加的环境音，并支持独立开关与音量。

### Prompt

```
为 Summer 项目的白噪音混音器接入真实环境音播放。

现状：
- store/player.uts 中 ambients 只有 id/name/icon/on。
- toggleAmbient(id) 只切换 on 状态。
- components/mixer-drawer/mixer-drawer.uvue 只展示开关状态。

请完成：

1. 扩展 AmbientTrack 类型：
   - audioUrl: string
   - volume: number
   - loading: boolean
   - error: boolean

2. 在 store/player.uts 中为每个 ambient 配置音频地址：
   - wave: 海浪循环音
   - cicada: 夏蝉循环音
   - rain: 微雨循环音
   可以先使用可靠的公开 mp3 链接或放到 static/audio/ 后使用本地路径。

3. 在 store/player.uts 建立 ambient audio 管理：
   - 模块顶层维护 Map<string, InnerAudioContext> 或等价结构。
   - 每个 ambient 独立 createInnerAudioContext()。
   - loop = true。
   - toggleAmbient 打开时 play，关闭时 pause。
   - onError 时设置 error=true 并 showToast。

4. 增加 setAmbientVolume(id, volume)：
   - volume 0-1 clamp。
   - 同步到对应 audio.volume。
   - storage 持久化每个 ambient 的开关和音量。

5. 修改 mixer-drawer.uvue：
   - 每个 track 显示开关状态。
   - 打开后显示一个简洁的竖向或横向音量条。
   - error 状态显示“加载失败”或禁用态。
   - loading 时有轻微视觉反馈。

6. 文案优化：
   - 标题可改为“环境混音”。
   - 副标题改为“叠加海浪、夏蝉与微雨，调出你的夏日背景声”。

验收：
- 打开海浪能听到循环环境音。
- 同时打开多个环境音可叠加。
- 关闭某项后对应声音停止。
- 重启 App 后恢复上次开关和音量。
- 音频失败时不白屏，有提示。
```

---

## Phase 4 - 音频错误边界与播放可靠性（P0）

### 目标

提高播放器可靠性。音频链接失败、playlist 越界、空数组、拖拽 seek 边界都要友好处理，避免用户卡死。

### Prompt

```
为 Summer 项目的真实音频播放器补齐错误边界。

现状：
- store/player.uts 中 ctx.onError 只 showToast，不跳过。
- loadCurrentSong 直接 playlist[state.currentSongIndex]，在越界或空数组时有风险。
- currentSong 有 fallback，但 loadCurrentSong / nextSong / prevSong 没完全防御空数组。

请完成：

1. 增加 safeGetSong(index)：
   - playlist 为空返回 fallbackSong。
   - index 越界返回 playlist[0]。

2. 修改 loadCurrentSong：
   - 使用 safeGetSong。
   - 如果 audioUrl 为空，showToast 后不播放。
   - markSongListened 前确认 index 合法。

3. 修改 nextSong / prevSong：
   - playlist.length == 0 时直接返回并提示。
   - 避免取模除以 0。

4. 修改 ctx.onError：
   - 设置 state.isPlaying = false。
   - showToast “当前音频加载失败，已为你跳到下一首”。
   - 自动尝试 nextSong()。
   - 增加错误跳过保护，避免所有歌曲都失败时无限 nextSong 循环。

5. 修改 seek 相关：
   - state.duration <= 0 时拖拽只更新 UI，不调用 audio.seek。
   - endSeekDrag 后恢复播放前确认 audioUrl 有效。

6. 可选：新增 state.audioErrorMessage / state.audioLoading。
   - 在 UI 上给 mini-player 或律动页显示轻提示。

验收：
- 把某首歌 audioUrl 临时改为空，不会白屏或卡住。
- 播放失败会自动跳下一首。
- playlist 为空时页面显示 fallbackSong，不崩溃。
```

---

## Phase 5 - 漂流瓶系统真实可玩化（P1）

### 目标

漂流瓶是产品很有情绪价值的模块，但目前只有静态预设。要增加投瓶、回信和持久化，让用户能留下自己的内容。

### Prompt

```
为 Summer 项目实现可持久化的漂流瓶系统。

现状：
- store/player.uts 的 bottles 是静态 Bottle[]。
- bottle-modal 只能查看 message 并“放回大海”。
- 发现页没有投瓶入口。

请完成：

1. 扩展 Bottle 类型：
   - id: number
   - message: string
   - songTitle: string
   - createdAt: number
   - replies: string[]

2. store/player.uts：
   - 把 bottles 从 const 静态数组改为 ref<Bottle[]>。
   - 首次启动如果 storage 没有 bottles，则写入 4 条预设。
   - 新增 addBottle(message: string)：
     - message trim，最长 80 字。
     - 绑定 currentSong.value.title。
     - createdAt = Date.now()。
     - 保存到 storage。
   - 新增 addBottleReply(id: number, reply: string)。
   - 新增 openBottle / closeBottle 保持可用。

3. 修改 utils/storage.uts：
   - StorageKeys 增加 BOTTLES。

4. 发现页新增“投瓶”入口：
   - 可放在漂流瓶标题右侧，或底部 FAB。
   - 点击打开底部抽屉/弹窗。
   - 输入 80 字以内文字。
   - 提交后 addBottle，并显示 Toast。

5. 修改 bottle-modal.uvue：
   - 主按钮改为“知道了”。
   - 增加次按钮“回信”。
   - 点击回信显示输入框，提交后 addBottleReply。
   - 显示关联歌曲，如“漂来时正在听：《夏日清风》”。

6. 发现页瓶子列表：
   - 展示用户新增瓶子。
   - 消息过长时安全截断。
   - 空状态友好显示。

验收：
- 可以投一个新瓶子。
- 重启 App 后瓶子仍存在。
- 可以给瓶子回信。
- 文案不再只有“放回大海”。
```

---

## Phase 6 - 个性化内容闭环：让小岛数据反哺推荐（P1）

### 目标

当前小岛页已经统计播放时长、听过歌曲、mood 占比，但这些数据没有反过来改变推荐内容。要让用户感觉“App 越用越懂我”。

### Prompt

```
为 Summer 项目建立个性化推荐闭环，让播放统计影响发现页内容。

现状：
- store/player.uts 已有 playerStats、vibeDnasComputed、playerLevel、levelTitle。
- 发现页每日精选仍直接展示 playlist。
- app-header 的 greeting 只按时间变化，不结合用户画像。

请完成：

1. 在 store/player.uts 新增 dominantMoodId computed：
   - 根据 playerStats.moodCounts 取 seconds 最大的 mood。
   - total 为 0 时返回 state.moodId 或 defaultMoodByTime()。

2. 为 Song 类型增加 moodId 或 moodIds：
   - 给现有 playlist 补 moodId。
   - 例如海边清爽歌 sea-salt，日落感 strawberry，安静自然 mint。

3. 新增 personalizedPlaylist computed：
   - 优先展示 dominantMoodId 匹配歌曲。
   - 再补齐其他歌曲。
   - 已听过歌曲可以后置，除非列表太短。

4. 修改发现页：
   - 搜索为空时“每日精选”使用 personalizedPlaylist，而不是原始 playlist。
   - 增加一个小标题说明，例如：
     - 无播放数据：“先听几首歌，我会慢慢懂你的夏天”
     - 有数据：“根据你的音乐画像推荐”

5. 修改 app-header：
   - greeting 可结合时间 + dominantMoodId。
   - 例：
     - sea-salt: “海风适合慢慢听”
     - strawberry: “日落正在靠近”
     - mint: “给夜晚一点清凉”
   - 保持短句，不要太长。

6. 修改场景歌单：
   - Phase 2 中 getSongsForScene(scene) 改为基于 song.moodId 筛选。

验收：
- 听某一 mood 歌曲一段时间后，发现页推荐顺序变化。
- 小岛音乐画像和发现页推荐逻辑一致。
- 无播放数据时文案友好，不假装已经懂用户。
```

---

## Phase 7 - 三页切换体验与滚动位置保留（P1）

### 目标

当前三页通过 `v-if` 切换，会卸载页面，导致滚动位置和组件状态容易丢失。要改成更像真实 App 的稳定切页体验。

### Prompt

```
优化 Summer 项目三页切换体验，保留滚动位置并减少频繁动效疲劳。

现状：
- pages/index/index.uvue 中三页 scroll-view 使用 v-if="renderedIndex == x"。
- 切页动画使用 opacity + translateY，多处 Ease.outBack。

请完成：

1. 页面保活：
   - 将三页 v-if 改为 v-show 或等效保活方案。
   - 保证律动、发现、小岛页切换后不重新 mount。

2. 滚动位置保留：
   - 为发现页和小岛页维护 scrollTop ref。
   - scroll-view 监听 @scroll。
   - 切回页面时恢复 scrollTop。
   - 如 uvue scrollTop 绑定有限制，则采用保活优先，记录方案写注释。

3. 切页动效调轻：
   - 页面切换 duration 控制在 260-320ms。
   - ease 改为 Ease.inOutCubic 或 Ease.inOutQuad。
   - 减少 outBack，只在奖励/点击反馈使用。

4. 底部导航：
   - indicator 动画也改为更稳的曲线。
   - 连续点击不同 tab 不应出现错乱。

5. 可选：横向手势切页：
   - 在主 body 外层监听 touchstart/move/end。
   - 横向滑动超过屏宽 25% 切页。
   - 注意与 vinyl 上下滑音量手势冲突。

验收：
- 发现页滚动到下方，切到小岛再切回来，位置尽量保留。
- 连续快速切 tab 动画不抖。
- 页面切换更轻，不显疲劳。
```

---

## Phase 8 - 设计 Token 全量接管与视觉一致性（P1）

### 目标

项目已经有 `utils/tokens.uts`，但大量组件仍手写颜色、透明度、圆角。要让设计系统成为单一来源，降低后续改版成本。

### Prompt

```
为 Summer 项目做设计 token 收敛和视觉一致性清理。

现状：
- utils/tokens.uts 已有 Colors / Radius / Duration / FontSize。
- pages/index/index.uvue 和多个组件仍手写 #1B4965、rgba(27, 73, 101, ...)、大圆角等。
- glass-panel 组件存在但未成为统一玻璃容器。

请完成：

1. 扩展 tokens：
   - Colors 增加常用透明度档位，最多保留 4-5 档。
   - Radius 覆盖 card / sheet / circle / pill。
   - Duration 覆盖 tap / page / modal / ambient。
   - 如需要，增加 LetterSpacing 或 Shadow tokens。

2. 同步 uni.scss：
   - 添加对应 SCSS 变量。
   - 保证 uvue style 中能使用。

3. 全项目替换硬编码：
   - #1B4965
   - #AEEFF0
   - #FF8577
   - 常见 rgba(27, 73, 101, ...)
   - 常见 rgba(255, 255, 255, ...)
   替换为 token 或 SCSS 变量。

4. 统一玻璃面板：
   - 让 glass-panel 支持必要 props：
     - radius
     - padding
     - opacity variant
   - album-card / stat-card / mini-player / bottom-nav / dna-panel 优先复用 glass-panel。
   - 删除重复玻璃样式。

5. 统一圆角尺度：
   - 避免 32/36/40/48/56/64 同时大量存在。
   - 卡片建议 28 或 32。
   - 弹窗/底部抽屉可 40 或 48。
   - pill 统一 999。

6. 保持视觉不大变：
   - 这一步是系统化，不是大改风格。
   - 替换后视觉应基本一致。

验收：
- 搜索 #1B4965 等硬编码显著减少，核心组件不再散落重复样式。
- 玻璃面板视觉一致。
- 修改主色只需改 tokens/uni.scss。
```

---

## Phase 9 - 文案体系与中英风格统一（P2）

### 目标

当前产品中英文混排有风格感，但核心功能文案有时像装饰，不够准确。要保留潮流感，同时让用户明确知道能做什么。

### Prompt

```
为 Summer 项目统一产品文案体系。

现状示例：
- AMBIENT MIXER
- MORNING BLISS
- SEA POP
- 进入传送门
- 放回大海

请完成：

1. 制定文案原则：
   - 功能入口优先中文，确保用户知道能做什么。
   - 英文只作为短标签或氛围点缀。
   - 避免承诺超过实际功能。

2. 替换核心文案：
   - AMBIENT MIXER -> 环境混音
   - 进入传送门 -> 查看歌单
   - 放回大海 -> 知道了
   - VIBE DNA -> 音乐画像
   - ISLAND ENERGY -> 岛屿能量
   - 每日精选可按个性化阶段改为“为你漂来的歌”

3. app-header greeting：
   - 不要只用英文。
   - 可用中文短句 + mood emoji。
   - 例如“海风适合慢慢听”“日落正在靠近”“夜晚降温中”。

4. 空状态文案：
   - 搜索无结果。
   - 未开始听歌。
   - 漂流瓶为空。
   - 音频加载失败。
   都要短、具体、温柔。

5. 检查按钮文案：
   - 按钮必须描述动作，不要只描述氛围。
   - 例如“回信”“投瓶”“播放”“查看歌单”。

验收：
- 用户不需要猜按钮用途。
- 英文保留为风格点缀，不影响理解。
- 所有空状态都有友好文案。
```

---

## Phase 10 - 隐藏交互显性化：音量手势与黑胶细节（P2）

### 目标

黑胶上下滑调音量是好设计，但太隐藏。唱针和切歌动效也可以更真实，增强深度用户的喜爱。

### Prompt

```
优化 Summer 项目的黑胶交互提示和唱机细节。

现状：
- pages/index/index.uvue 在 vinyl-touch 上支持上下滑调整 state.volume。
- 用户没有明显提示知道可滑动调音量。
- vinyl-disc 唱针只根据 playing 状态转动，不随 progress 内移。

请完成：

1. 音量手势提示：
   - 首次进入律动页时，在黑胶附近显示 2-3 秒轻提示：“上下滑动黑胶调音量”。
   - 用户第一次完成音量滑动后，写入 storage，不再显示。
   - 提示样式轻，不遮挡主要内容。

2. 音量浮层优化：
   - volume-indicator 显示百分号，如 70%。
   - 音量为 0 时显示“静音”。
   - 连续滑动时不要频繁闪烁。

3. 唱针随进度变化：
   - vinyl-disc 增加 progress prop。
   - pages/index/index.uvue 传 state.progress。
   - 播放时 tonearmRot = 外圈角度 + progress 映射到内圈角度。
   - 暂停时保持抬起状态。

4. 切歌细节：
   - 当前 cover fade + speed tween 已有基础。
   - 增加歌词区域淡出/淡入与封面切换同步。
   - 切歌时 progress 归零，唱针回外圈。

验收：
- 新用户能发现音量手势。
- 黑胶播放时唱针有轻微内移。
- 切歌更像“慢下来、换唱片、重新转起来”。
```

---

## Phase 11 - 弱网图片策略与本地资源兜底（P2）

### 目标

当前歌曲封面和场景图大量依赖远程 Unsplash。弱网时产品会失去第一视觉。要为关键图片提供兜底。

### Prompt

```
为 Summer 项目补充图片弱网兜底和关键资源本地化策略。

现状：
- playlist cover 和 categories image 多为远程 Unsplash URL。
- image-fallback 有加载态和失败态，但失败态较简单。

请完成：

1. 准备本地兜底图：
   - 在 static/images/ 下加入 3-5 张夏日主题本地图片或渐变占位图。
   - 如果不能新增真实图片，可用纯色/渐变占位资源。

2. 扩展 Song / Category：
   - 增加 localCover 或 fallbackImage 字段。
   - image-fallback 增加 fallbackSrc prop。

3. 修改 image-fallback：
   - 远程加载失败时，如果 fallbackSrc 非空，切换到 fallbackSrc。
   - fallbackSrc 也失败时，再显示 emoji + “图片加载失败”。
   - 加载态保持 shimmer，但不要无限占用性能。

4. 替换调用：
   - album-card、scene-card、vinyl-disc 传入 fallbackSrc。

5. 可选：
   - 增加网络状态监听 uni.onNetworkStatusChange。
   - 离线时顶部显示“离线模式，部分图片可能使用缓存”。

验收：
- 断网或远程图失败时，页面仍有可接受视觉。
- 不会出现大面积空白。
- image-fallback 不因失败循环重试导致闪烁。
```

---

## Phase 12 - 动效引擎细节修正与性能检查（P2）

### 目标

项目已经有中心 tween，但仍使用 Date.now；部分组件自己开 setInterval。要做一次性能和动画稳定性检查。

### Prompt

```
为 Summer 项目做动效性能和稳定性优化。

现状：
- utils/tween.uts 使用 Date.now()。
- vinyl-disc 和 image-fallback 自己维护 setInterval。
- 多处 outBack 动画可能频繁触发。

请完成：

1. 时间源：
   - 如果 uni-app x 环境支持 performance.now()，将 tween.uts 的 now() 改为 performance.now()。
   - 如果不支持，保留 Date.now()，但写注释说明。

2. interval 检查：
   - 确认所有 setInterval 都在 onUnmounted clear。
   - image-fallback 加载完成后可以停止 shimmer timer，而不是继续空跑。
   - vinyl-disc 在 speed=0 且未播放时可降低 tick 频率或停止，播放时再启动。

3. 动效曲线收敛：
   - 页面切换、底部导航、列表入场使用较稳曲线。
   - outBack 只用于点击反馈、升级庆祝、黑胶落针等重点时刻。

4. 快速交互测试：
   - 快速切 tab。
   - 快速切 mood。
   - 连续点播放/暂停。
   - 连续切歌。
   确认没有明显闪烁、错位、状态倒退。

验收：
- 动画仍顺滑。
- 离开组件后无残留 interval。
- 快速操作不抖动。
```

---

## 推荐执行路线

### 最小可交付路线

如果只想最快让产品从 Demo 变成可用 App：

1. Phase 1 - 搜索真功能化
2. Phase 2 - 场景传送门详情页
3. Phase 3 - 白噪音真实播放
4. Phase 4 - 音频错误边界

### 留存增强路线

如果想让用户愿意第二天回来：

1. Phase 5 - 漂流瓶系统
2. Phase 6 - 个性化推荐闭环
3. Phase 10 - 隐藏交互显性化

### 工程质量路线

如果准备长期维护或展示代码质量：

1. Phase 7 - 页面保活和切换体验
2. Phase 8 - 设计 token 全量接管
3. Phase 9 - 文案体系统一
4. Phase 12 - 动效性能检查

---

## 最终验收标准

全部阶段完成后，产品应满足：

1. 用户点击搜索、传送门、混音器、漂流瓶，都有真实功能，而不是装饰反馈。
2. 播放器在音频失败、空数据、弱网场景下不白屏、不卡死。
3. 小岛画像能真实来自播放数据，并反过来影响推荐内容。
4. 视觉风格保持夏日、清凉、音乐陪伴感，但设计 token 统一。
5. 主要页面切换稳定，滚动位置尽量保留，动效不过度打扰。
6. 文案准确描述功能，英文只作为氛围补充。
7. 深度用户第二次、第三次打开时，仍能发现新内容或感到 App 更懂自己。
