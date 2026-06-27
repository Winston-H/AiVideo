import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { addPrototype, getPrototype, getScript, listPrototypesByScript, replacePrototypesForScript, updatePrototype } from '../services/store.js';
import { buildShotPrototypes, renderPrototypeSvg } from '../services/prototype_renderer.js';

const router = express.Router();
const uploadDir = path.resolve('storage/assets/prototypes');

router.get('/', async (req, res, next) => {
  try {
    if (!req.query.scriptId) return res.json({ prototypes: [] });
    res.json({ prototypes: await listPrototypesByScript(req.query.scriptId) });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const script = await getScript(req.body.scriptId);
    if (!script) return res.status(404).json({ error: '请先生成剧本' });
    const prototypes = await replacePrototypesForScript(script.id, await buildShotPrototypes(script));
    res.json({ prototypes });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', async (req, res, next) => {
  try {
    const script = await getScript(req.body.scriptId);
    if (!script) return res.status(404).json({ error: '请先生成剧本' });
    const match = String(req.body.imageDataUrl || '').match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: '只支持 png、jpg、webp 图片' });
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const id = randomUUID();
    const fileName = `${script.id}-upload-${id}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const current = await listPrototypesByScript(script.id);
    const now = new Date().toISOString();
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(match[2], 'base64'));
    const prototype = await addPrototype({
      id,
      scriptId: script.id,
      index: current.length + 1,
      title: String(req.body.title || `上传草图 ${current.length + 1}`).trim(),
      description: '用户上传的本地参考草图',
      shotSize: '参考图',
      composition: '按上传图片构图',
      filePath,
      url: `/storage/assets/prototypes/${fileName}`,
      uploaded: true,
      createdAt: now,
      updatedAt: now
    });
    res.json({ prototype });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const current = await getPrototype(req.params.id);
    if (!current) return res.status(404).json({ error: '原型草图不存在' });
    const prototype = await updatePrototype(req.params.id, {
      title: String(req.body.title || current.title).trim(),
      description: String(req.body.description || current.description).trim(),
      shotSize: String(req.body.shotSize || current.shotSize).trim(),
      composition: String(req.body.composition || current.composition).trim()
    });
    if (!prototype.uploaded) await renderPrototypeSvg(prototype);
    res.json({ prototype });
  } catch (error) {
    next(error);
  }
});

router.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || '草图模块异常' });
});

export default router;
