import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import apiConfig from '../config/api_config.js';
import { addVideo, getSelectedStoryboard, getSelectedStoryboards, getStoryboardsByIds, getVideo, listVideosByScript, updateVideo } from '../services/store.js';
import { createVideoTask, createVideoTasks, refreshVideoTask } from '../services/video_generator.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    if (!req.query.scriptId) return res.json({ videos: [] });
    res.json({ videos: await listVideosByScript(req.query.scriptId) });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const storyboard = await getSelectedStoryboard();
    if (!storyboard) return res.status(400).json({ error: '请先选中一张分镜图' });
    const video = await addVideo(await createVideoTask(storyboard, normalizeSettings(req.body)));
    res.json({ video });
  } catch (error) {
    next(error);
  }
});

router.post('/generate-batch', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.storyboardIds) ? req.body.storyboardIds.map(String) : [];
    const storyboards = ids.length ? await getStoryboardsByIds(ids) : await getSelectedStoryboards();
    if (!storyboards.length) return res.status(400).json({ error: '请先多选分镜图' });
    const results = await createVideoTasks(storyboards, normalizeSettings(req.body), Number(process.env.VIDEO_TASK_CONCURRENCY || 3));
    const videos = [];
    for (const result of results) {
      if (result.ok) videos.push(await addVideo(result.video));
    }
    res.json({ videos, errors: results.filter((result) => !result.ok) });
  } catch (error) {
    next(error);
  }
});

router.post('/tk/optimize', async (req, res, next) => {
  try {
    res.json({ prompt: await optimizeTkPrompt(req.body) });
  } catch (error) {
    next(error);
  }
});

router.post('/tk', async (req, res, next) => {
  try {
    const settings = normalizeSettings(req.body);
    const referenceUrl = String(req.body.imageUrl || '').trim() || await saveTkImage(req.body.imageDataUrl, req);
    if (!settings.prompt && !referenceUrl) return res.status(400).json({ error: '请填写提示词或上传参考图' });
    const video = await addVideo(await createVideoTask({
      id: `tk-${Date.now()}`,
      scriptId: 'tk',
      title: settings.prompt.slice(0, 36) || 'TK 视频',
      remoteUrl: referenceUrl,
      url: referenceUrl,
      requiresImage: false
    }, settings));
    res.json({ video, note: referenceUrl && !/^https?:\/\/localhost[:/]/.test(referenceUrl) ? '参考图已上传为公网 URL' : '' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/refresh', async (req, res, next) => {
  try {
    const video = await getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: '视频片段不存在' });
    const patch = await refreshVideoTask(video);
    res.json({ video: await updateVideo(video.id, patch) });
  } catch (error) {
    next(error);
  }
});

function normalizeSettings(body) {
  return {
    duration: Number(body.duration || 18),
    frameRate: Number(body.frameRate || 24),
    resolution: ['480p', '720p', '1080p'].includes(body.resolution) ? body.resolution : '1080p',
    aspectRatio: ['16:9', '9:16', '1:1', '4:5'].includes(body.aspectRatio) ? body.aspectRatio : '9:16',
    market: String(body.market || '').trim(),
    language: String(body.language || '').trim(),
    prompt: String(body.prompt || '').trim(),
    negativePrompt: String(body.negativePrompt || 'text, subtitles, watermark, flicker, deformation, object disappearing, distorted hands, distorted face').trim(),
    motion: String(body.motion || '轻微动态，主体自然呼吸感').trim(),
    camera: String(body.camera || '缓慢推进镜头').trim()
  };
}

async function saveTkImage(dataUrl, req) {
  if (!dataUrl) return '';
  const match = String(dataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) throw new Error('参考图格式不支持，请上传 png、jpg 或 webp');
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const fileName = `tk-${Date.now()}.${ext}`;
  await fs.mkdir(path.resolve('storage/assets/tk'), { recursive: true });
  await fs.writeFile(path.resolve('storage/assets/tk', fileName), Buffer.from(match[2], 'base64'));
  if (apiConfig.imgbb.apiKey) return uploadToImgBB(match[2], fileName);
  return `${req.protocol}://${req.get('host')}/storage/assets/tk/${fileName}`;
}

async function uploadToImgBB(base64Image, fileName) {
  const form = new FormData();
  form.set('key', apiConfig.imgbb.apiKey);
  form.set('name', fileName);
  form.set('image', base64Image);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error?.message || `ImgBB 上传失败：${res.status}`);
  return data.data?.url || data.data?.display_url;
}

async function optimizeTkPrompt(body) {
  const base = String(body.prompt || '').trim() || '展示参考图中的商品，突出卖点、使用场景和购买理由。';
  const market = String(body.market || '日本').trim();
  const language = String(body.language || '日语').trim();
  const prompt = `把下面内容改写成适合 TikTok 带货/商品展示的图生视频提示词。输出 ${language}，只输出优化后的提示词，不要解释。必须包含 environment, product, character, action, camera, lighting, style 六段。市场：${market}。${body.hasImage ? '已上传商品参考图，必须保持参考图商品外观一致。' : ''} 原始内容：${base}`;
  if (!apiConfig.textModel.apiKey) return localTkPrompt(base, market, language);
  const res = await fetch(`${apiConfig.textModel.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiConfig.textModel.apiKey}`
    },
    body: JSON.stringify({
      model: apiConfig.textModel.model,
      messages: [
        { role: 'system', content: '你是短视频带货提示词优化师，擅长把粗略描述改成可直接用于文生视频/图生视频的结构化提示词。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6
    })
  });
  if (!res.ok) throw new Error(`提示词优化失败：${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || localTkPrompt(base, market, language);
}

function localTkPrompt(base, market, language) {
  return `[environment]\n${market}向けの明るい生活シーン。自然光、清潔感のある背景、スマートフォンで撮影されたリアルなTikTok動画。\n\n[product]\n参考画像の商品を主役として、形状、色、質感を保ったまま魅力的に見せる。\n\n[character]\n親しみやすい若い女性クリエイター。自然な笑顔で商品を紹介する。\n\n[action]\n${base} 商品を手に取り、近くで見せ、使い方と便利さを短い動作で示す。\n\n[camera]\n縦型9:16、手持ちスマホ風、軽い寄りと横移動、テンポよく商品にフォーカス。\n\n[lighting]\n明るく自然、商品ディテールが見える柔らかい光。\n\n[style]\n${language}のTikTok商品紹介動画、リアルで購買意欲を高める。`;
}

router.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || '图生视频模块异常' });
});

export default router;
