import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const outDir = path.resolve('storage/assets/prototypes');

export async function buildShotPrototypes(script) {
  await fs.mkdir(outDir, { recursive: true });
  const shots = sourceShots(script);
  const now = new Date().toISOString();

  return Promise.all(shots.map(async (shot, index) => {
    const id = randomUUID();
    const fileName = `${script.id}-${index + 1}-${id}.svg`;
    const filePath = path.join(outDir, fileName);
    const prototype = {
      id,
      scriptId: script.id,
      index: index + 1,
      title: shot.title || `镜头 ${index + 1}`,
      description: shot.visual || shot.shotNote || shot.dialogue || '',
      shotSize: shot.shotSize || defaultShotSize(index),
      composition: shot.composition || defaultComposition(index),
      filePath,
      url: `/storage/assets/prototypes/${fileName}`,
      createdAt: now,
      updatedAt: now
    };
    await renderPrototypeSvg(prototype);
    return prototype;
  }));
}

export async function renderPrototypeSvg(prototype) {
  await fs.mkdir(path.dirname(prototype.filePath), { recursive: true });
  await fs.writeFile(prototype.filePath, svg(prototype), 'utf8');
}

function sourceShots(script) {
  if (script.storyboardPrompts?.length) return script.storyboardPrompts;
  return (script.content?.acts || []).map((act) => ({
    title: act.title,
    visual: act.shotNote,
    dialogue: act.dialogue
  }));
}

function defaultShotSize(index) {
  return ['近景', '中景', '远景', '特写'][index % 4];
}

function defaultComposition(index) {
  return ['三分法左侧主体', '居中主体', '前景遮挡构图', '对角线动势'][index % 4];
}

function svg(prototype) {
  const safe = {
    title: escapeXml(prototype.title),
    desc: escapeXml(prototype.description),
    shot: escapeXml(prototype.shotSize),
    comp: escapeXml(prototype.composition)
  };
  const personX = prototype.index % 2 ? 270 : 450;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#10151b"/>
  <rect x="36" y="34" width="888" height="472" rx="18" fill="#151b22" stroke="#31404c" stroke-width="2"/>
  <line x1="332" y1="34" x2="332" y2="506" stroke="#25313b"/>
  <line x1="628" y1="34" x2="628" y2="506" stroke="#25313b"/>
  <line x1="36" y1="191" x2="924" y2="191" stroke="#25313b"/>
  <line x1="36" y1="349" x2="924" y2="349" stroke="#25313b"/>
  <rect x="72" y="70" width="190" height="44" rx="8" fill="#0d1116" stroke="#5bc0d6"/>
  <text x="92" y="98" fill="#7dd7ea" font-family="Arial, sans-serif" font-size="22">${safe.shot}</text>
  <text x="72" y="154" fill="#e8edf2" font-family="Arial, sans-serif" font-size="24">${safe.title}</text>
  <circle cx="${personX}" cy="270" r="42" fill="#263644" stroke="#7dd7ea" stroke-width="4"/>
  <rect x="${personX - 34}" y="316" width="68" height="110" rx="28" fill="#263644" stroke="#7dd7ea" stroke-width="4"/>
  <rect x="650" y="238" width="170" height="110" rx="10" fill="#202832" stroke="#8b97a5" stroke-width="3"/>
  <text x="672" y="299" fill="#8b97a5" font-family="Arial, sans-serif" font-size="20">关键物件/环境</text>
  <text x="72" y="456" fill="#8b97a5" font-family="Arial, sans-serif" font-size="18">${safe.comp}</text>
  <text x="72" y="486" fill="#8b97a5" font-family="Arial, sans-serif" font-size="16">${safe.desc.slice(0, 58)}</text>
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
