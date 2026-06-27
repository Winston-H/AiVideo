#!/usr/bin/env python3
"""Python 后端桥接入口。

当前第 1 模块不依赖 Python；后续草图、图片、视频、剪辑模块可以复用此入口。
"""

import json
import sys


def main():
    payload = json.load(sys.stdin)
    print(json.dumps({"ok": True, "echo": payload}, ensure_ascii=False))


if __name__ == "__main__":
    main()
