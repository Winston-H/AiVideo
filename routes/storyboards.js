import fs from 'node:fs/promises';
import express from 'express';
import {
  addStoryboards,
  deleteStoryboard,
  getStoryboard,
  listPrototypesByScript,
  listStoryboardsByScript,
  selectStoryboard,
  setStoryboardVideoSelected,
  setStoryboardsVideoSelected
} from '../services/store.js';
import { generateStoryboardImages } from '../services/storyboard_generator.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    if (!req.query.scriptId) return res.json({ storyboards: [] });
    res.json({ storyboards: await listStoryboardsByScript(req.query.scriptId) });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const prototypes = await listPrototypesByScript(req.body.scriptId);
    if (!prototypes.length) return res.status(400).json({ error: '请先生成镜头原型草图' });
    const settings = normalizeSettings(req.body);
    const storyboards = await addStoryboards(await generateStoryboardImages(prototypes, settings));
    res.json({ storyboards });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/select', async (req, res, next) => {
  try {
    const storyboard = await selectStoryboard(req.params.id);
    if (!storyboard) return res.status(404).json({ error: '分镜图不存在' });
    res.json({ storyboard });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/toggle-video', async (req, res, next) => {
  try {
    const storyboard = await setStoryboardVideoSelected(req.params.id, req.body.selected);
    if (!storyboard) return res.status(404).json({ error: '分镜图不存在' });
    res.json({ storyboard });
  } catch (error) {
    next(error);
  }
});

router.post('/select-video-batch', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    res.json({ storyboards: await setStoryboardsVideoSelected(ids, req.body.selected) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const storyboard = await deleteStoryboard(req.params.id);
    if (!storyboard) return res.status(404).json({ error: '分镜图不存在' });
    await fs.unlink(storyboard.filePath).catch(() => {});
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

function normalizeSettings(body) {
  return {
    size: ['1024x768', '768x1024', '1024x1024'].includes(body.size) ? body.size : '1024x768',
    style: String(body.style || '电影感写实分镜插画').trim(),
    negativePrompt: String(body.negativePrompt || '').trim()
  };
}

router.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || '分镜图模块异常' });
});

export default router;
