# DocKit 响应式布局设计

## 1. 设计目标

- **百分比/比例驱动**：关键尺寸使用 `%`、`vw`/`vh` 或基于根字号的 `rem`，窗口放大时整体比例一致。
- **缩放一致**：字体、间距、侧栏、标题栏随窗口等比缩放，不出现「小窗紧凑、大窗空洞」。
- **安全边界**：用 `clamp(min, preferred, max)` 限制最小/最大，避免过小难读、过大浪费。

---

## 2. 整体结构 ASCII 示意

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR  (height: var(--title-bar-h), 约 5vh, clamp 1.75rem~3rem)         │
│  [ DocKit                    ]  [ − ] [ □ ] [ × ]                            │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│   SIDEBAR    │   CONTENT (main)                                             │
│   width:     │   flex: 1                                                    │
│   var(--     │   overflow-y: auto                                           │
│   sidebar-w) │   padding: var(--page-pad-y) var(--page-pad-x)              │
│   约 18vw    │                                                              │
│   clamp      │   ┌─────────────────────────────────────────────────────┐   │
│   10~15rem   │   │  PAGE HEADER  (padding: var(--page-pad-*))           │   │
│              │   │  Title (font: var(--page-title-size))                 │   │
│  [Logo]      │   │  Description (font: var(--page-desc-size))            │   │
│  DocKit      │   ├─────────────────────────────────────────────────────┤   │
│  转换工具    │   │  PAGE BODY    (padding: var(--page-pad-*))           │   │
│  · HTML→PDF  │   │  - DropZone / FileList / Options / Buttons          │   │
│  · Word→PDF  │   │  - 所有间隙、圆角、字号均用 rem，随根字号缩放         │   │
│  · ...       │   │                                                      │   │
│  ─────────   │   └─────────────────────────────────────────────────────┘   │
│  设置        │                                                              │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
     ↑                           ↑
  --sidebar-w              --content 占满剩余
  (比例宽度)                 (flex: 1)
```

---

## 3. 根字号与比例缩放策略

- **根字号** `html { font-size: ... }` 使用 `clamp(12px, 0.5vw + 8px, 16px)`（小窗可读优先）：
  - 窗口约 840px 宽（最小）→ 约 12px → 1rem = 12px，小窗也清晰
  - 窗口约 960px 宽 → 约 12.8px
  - 窗口约 1920px 宽 → 16px → 1rem = 16px
- **所有字体、间距、圆角、图标区** 使用 `rem`，随根字号等比缩放。
- **标题栏高度、侧栏宽度** 使用 `clamp(rem, vw/vh, rem)`，既随视口又保上下限；标题栏最小 2rem、侧栏最小 11rem，小窗下仍好点选。

---

## 4. 布局变量定义 (:root)

| 变量名 | 含义 | 取值示例 |
|--------|------|----------|
| `--title-bar-h` | 标题栏高度 | clamp(2rem, 5vh, 3rem) |
| `--title-btn-size` | 标题栏按钮宽高 | 与 title-bar-h 一致 |
| `--sidebar-w` | 侧栏宽度 | clamp(11rem, 18vw, 15rem) |
| `--page-pad-x` | 页面水平内边距 | clamp(1.125rem, 2.5vw, 1.75rem) |
| `--page-pad-y` | 页面垂直内边距 | clamp(1.125rem, 2vh, 1.5rem) |
| `--page-header-pad-x` | 页面头部水平内边距 | clamp(1.125rem, 2.8vw, 1.75rem) |
| `--page-header-pad-y` | 页面头部垂直内边距 | clamp(1rem, 2vh, 1.25rem) |
| `--page-title-size` | 页面标题字号 | 1.2rem |
| `--page-desc-size` | 页面描述字号 | 0.82rem |
| `--gap-sm` | 小间隙 | 0.25rem |
| `--gap-md` | 中间隙 | 0.5rem |
| `--gap-lg` | 大间隙 | 1rem |
| `--radius-sm` | 小圆角 | 0.375rem |
| `--radius-md` | 中圆角 | 0.5rem |
| `--radius-lg` | 大圆角 | 0.625rem |

---

## 5. 主要区域与元素比例

```
TITLE BAR (--title-bar-h)
├── 左侧: 标题文字 (0.78rem)
└── 右侧: 三个按钮，每个宽高 = --title-bar-h
     [ − ] [ □ ] [ × ]

SIDEBAR (--sidebar-w)
├── logo 区: padding 0.5rem 0.625rem 1rem
├── 分组标题: 0.7rem, padding 0.25rem 0.625rem
├── 导航项: padding 0.4375rem 0.625rem, gap 0.5625rem, font 0.875rem
└── footer 上边距: 0.5rem

PAGE
├── header: padding --page-header-pad-y --page-header-pad-x
│   ├── title: --page-title-size (1.2rem)
│   └── desc: --page-desc-size (0.82rem)
└── body: padding --page-pad-y --page-pad-x
    ├── DropZone: padding 2rem 1.5rem, gap 0.625rem, 圆角 --radius-lg
    ├── 按钮组: gap --gap-md, 按钮 padding 用 rem
    └── File list / Options: gap、padding 统一 rem
```

---

## 6. 缩放效果示意（小窗 vs 大窗）

**小窗 (约 840×560，最小尺寸)**  
- 根字号 = 12px（下限），侧栏 ≈ 132px（11rem），标题栏 ≈ 24px（2rem）  
- 内边距、字号、圆角按 12px 基准，小窗下仍可读、好点选  

```
┌──────────────────────────────────────┐
│  DocKit                [−][□][×]     │  24px
├─────────┬────────────────────────────┤
│ ~132px  │  padding 13.5px            │
│         │  title 14.4px  desc 9.8px  │
│  nav    │  dropzone 24px pad         │
│  7.5px  │  buttons 8px 20px         │
└─────────┴────────────────────────────┘
```

**大窗 (约 1920×1080)**  
- 根字号 ≈ 16px，侧栏 ≈ 288px（18vw），标题栏 ≈ 48px（3rem 封顶）  
- 同一套 rem 数值，视觉上等比放大  

```
┌──────────────────────────────────────────────────────────────────┐
│  DocKit                                    [−][□][×]              │  48px
├─────────────────┬─────────────────────────────────────────────────┤
│     ~288px       │  padding 28px (1.75rem)                        │
│                  │  title 19.2px  desc 13px                       │
│  nav 11px pad    │  dropzone 48px pad, 按钮 11px 29px             │
└─────────────────┴─────────────────────────────────────────────────┘
```

---

## 7. 实现要点

1. **index.css**  
   - 设置 `html { font-size: clamp(12px, 0.5vw + 8px, 16px); }`（小窗最小 12px 保证可读）  
   - 在 `:root` 中定义上述布局与间距变量  

2. **App.css**  
   - 标题栏、侧栏的宽高用 `var(--title-bar-h)`、`var(--sidebar-w)`  
   - 所有原固定 `px` 的 padding、gap、border-radius、font-size 改为 `rem` 或 `var(--gap-*)`、`var(--radius-*)`  
   - 页面头部/内容区内边距用 `var(--page-pad-x)`、`var(--page-pad-y)` 等  

3. **不缩放**  
   - 1px 边框保持 `1px`（细线不随根字号放大）  
   - 必要时图标仍用 `em` 相对当前字号  

按此设计实现后，放大窗口时 UI/UX 会保持比例一致、阅读与点击区域同步放大。
