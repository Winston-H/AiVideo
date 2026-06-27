import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import apiConfig from '../config/api_config.js';

const outDir = path.resolve('storage/storyboards');

export async function generateStoryboardImages(prototypes, settings) {
  await fs.mkdir(outDir, { recursive: true });
  return Promise.all(prototypes.map((prototype) => generateOne(prototype, settings)));
}

async function generateOne(prototype, settings) {
  const id = randomUUID();
  const prompt = storyboardPrompt(prototype, settings);
  const fileName = `${prototype.scriptId}-${prototype.index}-${id}.png`;
  const filePath = path.join(outDir, fileName);

  if (apiConfig.imageModel.apiKey) {
    const image = await callImageModel(prompt, settings.size);
    await saveImage(image, filePath);
    return row(prototype, id, prompt, filePath, 'png', image.url || '');
  } else {
    await fs.writeFile(filePath.replace(/\.png$/, '.svg'), fallbackSvg(prototype, settings), 'utf8');
    return row(prototype, id, prompt, filePath.replace(/\.png$/, '.svg'), 'svg');
  }
}

async function callImageModel(prompt, size) {
  const res = await fetch(`${apiConfig.imageModel.baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiConfig.imageModel.apiKey}`
    },
    body: JSON.stringify({
      model: apiConfig.imageModel.model,
      prompt,
      size,
      extra_body: { response_format: 'url' }
    })
  });
  if (!res.ok) throw new Error(`文生图请求失败：${res.status}`);
  const data = await res.json();
  const url = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;
  if (!url && !b64) throw new Error('文生图响应缺少图片');
  return { url, b64 };
}

async function saveImage(image, filePath) {
  if (image.b64) {
    await fs.writeFile(filePath, Buffer.from(image.b64, 'base64'));
    return;
  }
  const res = await fetch(image.url);
  if (!res.ok) throw new Error(`下载分镜图失败：${res.status}`);
  await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
}

function row(prototype, id, prompt, filePath, ext, remoteUrl = '') {
  const createdAt = new Date().toISOString();
  return {
    id,
    prototypeId: prototype.id,
    scriptId: prototype.scriptId,
    index: prototype.index,
    title: prototype.title,
    prompt,
    filePath,
    url: `/storage/storyboards/${path.basename(filePath)}`,
    remoteUrl,
    selected: false,
    createdAt,
    updatedAt: createdAt,
    ext
  };
}

function storyboardPrompt(prototype, settings) {
  return [
    `专业短视频分镜插画，${settings.style}`,
    `镜头标题：${prototype.title}`,
    `画面描述：${prototype.description}`,
    `景别：${prototype.shotSize}`,
    `构图：${prototype.composition}`,
    '画面清晰，主体明确，适合后续图生视频，避免文字、水印、UI界面',
    settings.negativePrompt ? `负面词：${settings.negativePrompt}` : ''
  ].filter(Boolean).join('。');
}

function fallbackSvg(prototype, settings) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768">
  <rect width="1024" height="768" fill="#111820"/>
  <text x="52" y="84" fill="#7dd7ea" font-family="Arial" font-size="34">${escapeXml(prototype.title)}</text>
  <text x="52" y="142" fill="#e8edf2" font-family="Arial" font-size="24">${escapeXml(settings.style)}</text>
  <text x="52" y="704" fill="#8b97a5" font-family="Arial" font-size="22">${escapeXml(prototype.description).slice(0, 70)}</text>
</svg>`;
}

function escapeXml(value) {
  return String(value || '').replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
  })[char]);
}
