# DocKit

[English](#english) | [中文](#中文)

---

## English

### Overview

**DocKit** is a free, lightweight Windows desktop application for document conversion and image processing. It bundles five tools in one clean interface — all offline, no cloud, no subscription.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

### Features

| Tool | Input | Output | Engine |
|------|-------|--------|--------|
| **HTML → PDF** | `.html` `.htm` | `.pdf` | Chromium `printToPDF` (built-in) |
| **Word → PDF** | `.docx` `.doc` | `.pdf` | LibreOffice (high fidelity) / mammoth fallback |
| **PPT → PDF** | `.pptx` `.ppt` | `.pdf` | LibreOffice headless |
| **PDF Merge** | Multiple `.pdf` | `.pdf` | pdf-lib (pure JS) |
| **Image Tools** | `.jpg` `.png` `.webp` `.avif` `.gif` `.bmp` `.tiff` | Compressed / converted | Chromium Canvas API (built-in) |

- **Zero cloud** — runs entirely offline
- **Drag & Drop** — drag files directly from Explorer
- **Batch processing** — Image Tools and PDF Merge support multiple files
- **Configurable output directory** — save to any folder (default: Desktop)
- **LibreOffice auto-detect** — automatically finds your LibreOffice installation

### Requirements

- **Node.js** 18+ (development only)
- **LibreOffice** (optional, free) — required for Word→PDF (high fidelity) and PPT→PDF conversion
  - Download: https://www.libreoffice.org/download/libreoffice/

### Quick Start

```bash
# Clone the repository
git clone https://github.com/bingqianliu2017/html2pdf-windows.git
cd html2pdf-windows

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build installer (output in release/)
npm run build
```

### Project Structure

```
html2pdf-windows/
├── electron/
│   ├── main/
│   │   ├── index.ts            # App entry, window creation, IPC registration
│   │   ├── ipc/                # IPC handlers (one file per feature)
│   │   │   ├── window.ts       # Window controls, dialogs, settings
│   │   │   ├── html2pdf.ts     # HTML → PDF
│   │   │   ├── doc2pdf.ts      # Word → PDF
│   │   │   ├── ppt2pdf.ts      # PPT → PDF
│   │   │   ├── pdfmerge.ts     # PDF merge
│   │   │   └── imagetools.ts   # Image compress/convert
│   │   └── utils/
│   │       ├── settings.ts     # Persist settings to userData/settings.json
│   │       └── libreoffice.ts  # Detect LibreOffice installation paths
│   └── preload/
│       └── index.ts            # contextBridge — exposes electronAPI to renderer
├── src/
│   ├── components/             # Shared UI components
│   ├── pages/                  # One component per tool
│   ├── hooks/                  # useConvert (progress state management)
│   └── types/                  # electronAPI TypeScript declarations
├── public/
│   └── image-processor.html    # Hidden BrowserWindow for Canvas-based image processing
└── package.json
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop runtime | Electron 35 (Chromium 134) |
| Build | Vite 6 + vite-plugin-electron |
| UI | React 18 + TypeScript |
| HTML → PDF | Chromium `printToPDF` |
| Word → PDF | LibreOffice headless / mammoth |
| PPT → PDF | LibreOffice headless |
| PDF Merge | pdf-lib (pure JS) |
| Image Tools | Canvas 2D API in hidden BrowserWindow |

### License

MIT © 2025 [bingqianliu2017](https://github.com/bingqianliu2017)

---

## 中文

### 简介

**DocKit** 是一款免费的轻量级 Windows 桌面工具，提供文档转换和图片处理功能。五大工具集于一体，完全离线运行，无需云服务、无需订阅。

### 功能

| 工具 | 输入格式 | 输出格式 | 引擎 |
|------|----------|----------|------|
| **HTML → PDF** | `.html` `.htm` | `.pdf` | Chromium `printToPDF`（内置） |
| **Word → PDF** | `.docx` `.doc` | `.pdf` | LibreOffice（高还原度）/ mammoth 降级 |
| **PPT → PDF** | `.pptx` `.ppt` | `.pdf` | LibreOffice headless |
| **PDF 合并** | 多个 `.pdf` | `.pdf` | pdf-lib（纯 JS） |
| **图片工具** | `.jpg` `.png` `.webp` `.avif` `.gif` `.bmp` `.tiff` | 压缩 / 转格式 | Chromium Canvas API（内置） |

- **完全离线** — 无需联网
- **拖拽操作** — 直接从文件资源管理器拖拽文件
- **批量处理** — 图片工具和 PDF 合并均支持多文件
- **可配置输出目录** — 保存到任意文件夹（默认桌面）
- **LibreOffice 自动检测** — 自动探测系统中的 LibreOffice 安装路径

### 环境要求

- **Node.js** 18+（仅开发时需要，终端用户无需安装）
- **LibreOffice**（可选，免费）— Word→PDF 高还原度模式和 PPT→PDF 转换时需要
  - 下载地址：https://www.libreoffice.org/download/libreoffice/

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/bingqianliu2017/html2pdf-windows.git
cd html2pdf-windows

# 安装依赖
npm install

# 开发模式运行（直接启动带热更新的 Electron 窗口）
npm run dev

# 打包发布（输出安装包到 release/ 目录）
npm run build
```

### 使用说明

1. 运行 `npm run dev` 启动开发版，或运行 `npm run build` 打包后安装
2. 从左侧菜单选择工具
3. 拖拽文件到对应区域，或点击「浏览选择」
4. 图片工具：可选择输出格式、质量、最大边长，支持批量处理
5. PDF 合并：添加多个 PDF，拖拽列表项调整顺序，点击合并
6. Word / PPT 转换：建议先安装 LibreOffice 以获得最佳还原效果
7. 前往「设置」可配置输出目录和 LibreOffice 路径

### 项目结构

```
html2pdf-windows/
├── electron/
│   ├── main/
│   │   ├── index.ts            # 应用入口，创建窗口，注册 IPC
│   │   ├── ipc/                # IPC 处理器（每个功能一个文件）
│   │   │   ├── window.ts       # 窗口控制、对话框、设置
│   │   │   ├── html2pdf.ts     # HTML → PDF
│   │   │   ├── doc2pdf.ts      # Word → PDF
│   │   │   ├── ppt2pdf.ts      # PPT → PDF
│   │   │   ├── pdfmerge.ts     # PDF 合并
│   │   │   └── imagetools.ts   # 图片压缩 / 转换
│   │   └── utils/
│   │       ├── settings.ts     # 设置持久化（userData/settings.json）
│   │       └── libreoffice.ts  # 自动探测 LibreOffice 安装路径
│   └── preload/
│       └── index.ts            # 通过 contextBridge 暴露 electronAPI
├── src/
│   ├── components/             # 公共 UI 组件
│   ├── pages/                  # 每个工具对应一个页面组件
│   ├── hooks/                  # useConvert（统一进度状态管理）
│   └── types/                  # electronAPI TypeScript 类型声明
├── public/
│   └── image-processor.html    # 隐藏 BrowserWindow，Canvas 图片处理核心
└── package.json
```

### 开发与贡献

- **启动开发模式**：`npm run dev`
- **打包**：`npm run build`

欢迎提交 Issue 或 Pull Request。

### 开源协议

MIT © 2025 [bingqianliu2017](https://github.com/bingqianliu2017)
