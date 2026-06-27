# AI 短视频制作台

原生 HTML/CSS/JS + Node.js + Python 的本地 AI 短视频制作平台。当前已完成六大核心流程：创意灵感生成、结构化 AI 剧本创作、镜头原型草图、精细化分镜插画生成、图生视频片段生成、网页端在线剪辑拼接。

## 目录

```text
config/      统一 API 配置
routes/      后端业务路由
services/    本地存储、AI 调用、Python 桥接
python/      Python 后端入口
public/      原生前端页面
storage/     本地持久化数据和素材
```

## 安装

```bash
npm install
```

## 启动

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## API 配置

统一配置文件：

```text
config/api_config.js
```

默认使用 Agnes AI OpenAI 兼容 Base URL：

```text
https://apihub.agnes-ai.com/v1
```

API Key 不写入代码，用环境变量传入：

```bash
TEXT_MODEL_API_KEY="你的 Agnes API Key" \
TEXT_MODEL_NAME="agnes-2.0-flash" \
npm run dev
```

本地开发也可以直接使用 `.env`：

```env
TEXT_MODEL_API_KEY=你的 Agnes API Key
TEXT_MODEL_NAME=agnes-2.0-flash
IMAGE_MODEL_API_KEY=你的 Agnes API Key
IMAGE_MODEL_NAME=agnes-image-2.1-flash
VIDEO_MODEL_API_KEY=你的 Agnes API Key
VIDEO_MODEL_NAME=agnes-video-v2.0
IMGBB_API_KEY=你的 ImgBB API Key
```

`IMGBB_API_KEY` 用于 TK 视频本地参考图上传：后端会先上传到 ImgBB 获取公网图片 URL，再传给 Agnes Video。

如需覆盖服务商地址：

```bash
TEXT_MODEL_BASE_URL="https://apihub.agnes-ai.com/v1" npm run dev
```

未配置文本模型时，系统会使用本地 mock 生成创意，方便先跑通流程。

## 已完成

- 创意表单：题材、风格、时长、受众、关键词、数量。
- 批量生成创意。
- 创意保存到 `storage/data/ideas.json`。
- 页面刷新、服务重启后数据不丢失。
- 选中创意并准备流转到剧本模块。
- 基于选中创意生成结构化剧本。
- 支持短视频、剧情短片、广告、口播脚本四种类型。
- 剧本保存到 `storage/data/scripts.json`。
- 剧本支持 JSON 编辑保存、导出 TXT、拆解为分镜文案。
- 基于剧本生成多组镜头原型草图。
- 草图以 SVG 文件保存到 `storage/assets/prototypes/`，索引保存到 `storage/data/prototypes.json`。
- 支持单镜头修改标题、描述、景别和构图。
- 基于镜头原型调用 Agnes Image 生成精细化分镜图。
- 分镜图保存到 `storage/storyboards/`，索引保存到 `storage/data/storyboards.json`。
- 支持分辨率、画风、负面词、批量生成、选中、删除、下载。
- 基于已选分镜图调用 Agnes Video 创建图生视频任务。
- 视频任务索引保存到 `storage/data/videos.json`，完成后 MP4 保存到 `storage/videos/`。
- 支持多选分镜图并发创建视频任务，默认并发数 `VIDEO_TASK_CONCURRENCY=3`。
- 默认视频规格按 Agnes 文档上限走：1080p、441 帧、24 FPS，约 18 秒。
- 支持时长、帧率、清晰度、动态幅度、运镜参数、状态刷新、下载 MP4。
- TK 视频支持负面词、ImgBB 本地图转公网 URL、Agnes 结果 URL 兼容解析，完成后会用 `ffmpeg` 生成首帧质检图。
- 视频片段自动进入剪辑素材池。
- 支持素材轨道拖拽排序、裁剪参数、片头片尾、工程保存。
- 导出完整 MP4 依赖服务器安装 `ffmpeg`，默认导出 1080p，保留原片音轨；无音轨片段会补静音音轨，导出文件保存到 `storage/projects/exports/`。

## 后续增强

1. 多用户登录和项目隔离
2. 生成任务队列和失败重试
3. 服务器对象存储和额度控制
