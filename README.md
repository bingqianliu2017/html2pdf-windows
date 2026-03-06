# html2pdf-windows

[English](#english) | [中文](#中文)

---

## English

### Overview

**html2pdf-windows** is a lightweight desktop application for converting HTML files to high-quality PDF with accurate CSS layout. Simply drag & drop or browse for HTML files, and the app automatically converts them to PDF and saves to your desktop. **Zero dependencies** — no Python, Chrome, or any external tools required.

[![GitHub](https://img.shields.io/badge/GitHub-bingqianliu2017%2Fhtml2pdf--windows-blue)](https://github.com/bingqianliu2017/html2pdf-windows)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

### Features

- **Drag & Drop** — Drop HTML files directly into the app
- **Browse** — Or use the file picker to select HTML files
- **High Quality** — Supports complex layouts (A4, page breaks, remote images, Chinese fonts)
- **Offline** — Uses Electron’s built-in Chromium engine; no internet required after install
- **Click to Open** — Open the generated PDF directly after conversion

### Requirements

- **Node.js** 18+ (development only; end users need no runtime)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/bingqianliu2017/html2pdf-windows.git
cd html2pdf-windows

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production (output in release/)
npm run build
```

### Usage

1. Launch the app
2. Drag an `.html` or `.htm` file into the drop zone, or click **Browse** to select one
3. Wait for conversion; PDF is saved to your Desktop with the same base filename
4. Click **Open** to view the generated PDF

### Tech Stack

| Layer   | Technology                          |
|---------|-------------------------------------|
| Desktop | Electron                            |
| Build   | Vite 6                              |
| UI      | React 18 + TypeScript               |
| PDF     | Chromium `printToPDF` (no extra libs)|

### Project Structure

```
html2pdf-windows/
├── electron/           # Electron main & preload
│   ├── main/           # Main process (window, IPC, PDF conversion)
│   └── preload/        # Preload scripts (context bridge)
├── src/                # React frontend
│   ├── App.tsx         # Main UI component
│   └── ...
├── release/            # Build output (after npm run build)
└── package.json
```

### Development & Contributing

- **Run dev**: `npm run dev`
- **Build**: `npm run build`
- **Preview (web)**: `npm run preview`

Contributions are welcome. Feel free to open an Issue or submit a Pull Request.

### License

MIT © 2025 [bingqianliu2017](https://github.com/bingqianliu2017)

---

## 中文

### 简介

**html2pdf-windows** 是一款轻量级桌面应用，可将 HTML 文件转换为高质量 PDF，并保持 CSS 布局。拖拽或选择 HTML 文件即可自动转换并保存到桌面。**开箱即用**，无需安装 Python、Chrome 或其他外部工具。

### 功能特点

- **拖拽**：将 HTML 文件直接拖入应用
- **浏览**：或通过文件选择器选择 HTML 文件
- **高质量**：支持复杂排版（A4、分页、远程图片、中文字体）
- **离线**：使用 Electron 内置 Chromium 引擎，安装后无需联网
- **一键打开**：转换完成后可直接打开生成的 PDF

### 环境要求

- **Node.js** 18+（仅开发需要；终端用户无需安装任何运行时）

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/bingqianliu2017/html2pdf-windows.git
cd html2pdf-windows

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包发布（输出在 release/ 目录）
npm run build
```

### 使用说明

1. 启动应用
2. 将 `.html` 或 `.htm` 文件拖入虚线区域，或点击「浏览选择」
3. 等待转换完成，PDF 将保存到桌面，文件名与 HTML 一致
4. 点击「点击打开」可查看生成的 PDF

### 技术栈

| 层级   | 技术                            |
|--------|---------------------------------|
| 桌面端 | Electron                        |
| 构建   | Vite 6                          |
| 界面   | React 18 + TypeScript           |
| PDF    | Chromium `printToPDF`（无额外库）|

### 项目结构

```
html2pdf-windows/
├── electron/           # Electron 主进程与预加载
│   ├── main/           # 主进程（窗口、IPC、PDF 转换）
│   └── preload/        # 预加载脚本（上下文桥接）
├── src/                # React 前端
│   ├── App.tsx         # 主界面组件
│   └── ...
├── release/            # 打包输出（npm run build 后）
└── package.json
```

### 开发与二次开发

- **开发模式**：`npm run dev`
- **打包**：`npm run build`
- **Web 预览**：`npm run preview`

欢迎参与贡献，可提交 Issue 或 Pull Request。

### 开源协议

MIT © 2025 [bingqianliu2017](https://github.com/bingqianliu2017)
