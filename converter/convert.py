#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML to PDF 转换脚本 - 使用 WeasyPrint
用法: python convert.py <input.html> <output.pdf>
"""

import sys
import os

def main():
    if len(sys.argv) != 3:
        print("用法: python convert.py <input.html> <output.pdf>", file=sys.stderr)
        sys.exit(1)

    html_path = sys.argv[1]
    pdf_path = sys.argv[2]

    if not os.path.exists(html_path):
        print(f"错误: 输入文件不存在: {html_path}", file=sys.stderr)
        sys.exit(1)

    try:
        from weasyprint import HTML
    except ImportError:
        print("错误: 未安装 WeasyPrint。请运行: pip install weasyprint", file=sys.stderr)
        sys.exit(1)

    try:
        html = HTML(filename=html_path)
        html.write_pdf(pdf_path)
        print(f"已保存: {pdf_path}")
    except Exception as e:
        print(f"转换失败: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
