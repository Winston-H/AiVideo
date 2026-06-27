import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import apiConfig from '../config/api_config.js';

const outDir = path.resolve('storage/videos');

export async function createVideoTask(storyboard, settings) {
  await fs.mkdir(outDir, { recursive: true });
  const image = publicStoryboardUrl(storyboard);
  if (apiConfig.videoModel.apiKey && storyboard.requiresImage !== false && !image) {
    throw new Error(`分镜「${storyboard.title}」缺少 Agnes 远程图片 URL，请重新生成这张分镜图后再创建视频`);
  }
  const id = randomUUID();
  const prompt = [
    settings.prompt || storyboard.title,
    settings.market ? `面向${settings.market}市场，符合当地短视频审美和商品展示习惯` : '',
    settings.language ? `音频和画面文字优先使用${settings.language}` : '',
    settings.motion,
    settings.camera,
    `高清 ${settings.resolution || '1080p'} 质量，细节清晰`,
    settings.aspectRatio ? `画面比例 ${settings.aspectRatio}` : '',
    '保持主体、画风和构图稳定，生成短视频镜头片段'
  ].filter(Boolean).join('。');

  if (!apiConfig.videoModel.apiKey) {
    return localVideoRow(id, storyboard, settings, prompt);
  }

  const dimensions = dimensionsForResolution(settings.resolution, settings.aspectRatio);
  const seconds = Number(settings.duration || 18);
  const numFrames = Math.min(framesForDuration(seconds), maxFramesFor(settings.resolution, settings.aspectRatio));
  const body = {
    model: apiConfig.videoModel.model,
    prompt,
    num_frames: numFrames,
    frame_rate: frameRateFor(numFrames, seconds, Number(settings.frameRate || 24)),
    width: dimensions.width,
    height: dimensions.height
  };
  if (settings.negativePrompt) body.negative_prompt = settings.negativePrompt;
  if (image) body.image = image;
  const res = await fetch(`${apiConfig.videoModel.baseUrl.replace(/\/$/, '')}/videos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiConfig.videoModel.apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`图生视频任务创建失败：${res.status}${detail ? ` ${detail.slice(0, 300)}` : ''}`);
  }
  const data = await res.json();
  return videoRow(id, storyboard, settings, prompt, data);
}

export async function refreshVideoTask(video) {
  if (!apiConfig.videoModel.apiKey || !video.videoId) return video;
  const url = `https://apihub.agnes-ai.com/agnesapi?video_id=${encodeURIComponent(video.videoId)}&model_name=${encodeURIComponent(apiConfig.videoModel.model)}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${apiConfig.videoModel.apiKey}` } });
  if (!res.ok) throw new Error(`视频状态查询失败：${res.status}`);
  const data = await res.json();
  const patch = {
    status: data.status || video.status,
    progress: data.progress ?? video.progress,
    remoteUrl: findVideoUrl(data) || video.remoteUrl || ''
  };
  if (patch.status === 'completed' && patch.remoteUrl && !video.localUrl) {
    Object.assign(patch, await downloadVideo(video.id, patch.remoteUrl));
  }
  return patch;
}

export async function createVideoTasks(storyboards, settings, concurrency = 3) {
  const queue = [...storyboards];
  const results = [];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, async () => {
    while (queue.length) {
      const storyboard = queue.shift();
      try {
        results.push({ ok: true, video: await createVideoTask(storyboard, settings) });
      } catch (error) {
        results.push({ ok: false, storyboardId: storyboard.id, title: storyboard.title, error: error.message });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function downloadVideo(id, remoteUrl) {
  const filePath = path.join(outDir, `${id}.mp4`);
  const res = await fetch(remoteUrl);
  if (!res.ok) return { downloadError: `下载 MP4 失败：${res.status}` };
  await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
  const qaPath = await createQaFrame(id, filePath);
  return {
    filePath,
    localUrl: `/storage/videos/${path.basename(filePath)}`,
    qaImageUrl: qaPath ? `/storage/videos/${path.basename(qaPath)}` : ''
  };
}

async function createQaFrame(id, filePath) {
  const outPath = path.join(outDir, `${id}-qa.jpg`);
  try {
    await run('ffmpeg', ['-y', '-ss', '00:00:01', '-i', filePath, '-frames:v', '1', '-vf', 'scale=360:-1', outPath]);
    return outPath;
  } catch {
    return '';
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code ? reject(new Error(stderr || `${command} exited ${code}`)) : resolve());
  });
}

function findVideoUrl(payload) {
  return [
    payload.remixed_from_video_id,
    payload.video_url,
    payload.output,
    payload.data?.video_url,
    payload.data?.output
  ].find((value) => typeof value === 'string' && value.startsWith('http')) || JSON.stringify(payload).match(/https?:\/\/[^"\\]+\.mp4[^"\\]*/)?.[0]?.replaceAll('\\/', '/');
}

function videoRow(id, storyboard, settings, prompt, data) {
  const now = new Date().toISOString();
  return {
    id,
    storyboardId: storyboard.id,
    scriptId: storyboard.scriptId,
    title: storyboard.title,
    prompt,
    settings,
    taskId: data.task_id || data.id || '',
    videoId: data.video_id || '',
    status: data.status || 'queued',
    progress: data.progress || 0,
    remoteUrl: '',
    localUrl: '',
    qaImageUrl: '',
    filePath: '',
    createdAt: now,
    updatedAt: now
  };
}

function localVideoRow(id, storyboard, settings, prompt) {
  return {
    ...videoRow(id, storyboard, settings, prompt, { status: 'mocked', progress: 100 }),
    remoteUrl: '',
    localUrl: '',
    note: '未配置 VIDEO_MODEL_API_KEY，未创建真实视频任务'
  };
}

function framesForDuration(duration) {
  const seconds = Number(duration || 18);
  if (seconds <= 3) return 81;
  if (seconds <= 5) return 121;
  if (seconds <= 10) return 241;
  return 441;
}

function maxFramesFor(resolution, aspectRatio) {
  if (resolution === '1080p') return 169;
  if (resolution === '720p' && aspectRatio === '9:16') return 409;
  return 441;
}

function frameRateFor(numFrames, seconds, requested) {
  return numFrames < framesForDuration(seconds) ? Math.max(1, Math.floor(numFrames / seconds)) : requested;
}

function dimensionsForResolution(resolution, aspectRatio = '16:9') {
  const base = resolution === '480p' ? 480 : resolution === '720p' ? 720 : 1080;
  const wide = base === 480 ? 854 : base === 720 ? 1280 : 1920;
  return {
    '9:16': { width: base, height: wide },
    '1:1': { width: base, height: base },
    '4:5': { width: base, height: Math.round(base * 1.25) },
    '16:9': { width: wide, height: base }
  }[aspectRatio] || { width: wide, height: base };
}

function publicStoryboardUrl(storyboard) {
  // 服务器部署后需把此地址换成公网可访问 URL；本地调试可用已公开的分镜 URL。
  return storyboard.remoteUrl || storyboard.url;
}
