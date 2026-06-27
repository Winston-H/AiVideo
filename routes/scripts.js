import express from 'express';
import {
  addScript,
  getIdea,
  getScript,
  getScriptByIdea,
  getSelectedIdea,
  listScripts,
  updateScript
} from '../services/store.js';
import { generateStructuredScript, splitScriptToStoryboardPrompts } from '../services/ai_client.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const ideaId = req.query.ideaId;
    if (ideaId) return res.json({ script: await getScriptByIdea(ideaId) });
    res.json({ scripts: await listScripts(), selectedIdea: await getSelectedIdea() });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const idea = await getIdea(req.body.ideaId);
    if (!idea) return res.status(404).json({ error: '请先选择一个创意' });
    const type = normalizeType(req.body.type);
    const content = await generateStructuredScript(idea, type);
    const script = await addScript(idea, type, content);
    res.json({ script });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const content = typeof req.body.content === 'string' ? JSON.parse(req.body.content) : req.body.content;
    const script = await updateScript(req.params.id, { content });
    if (!script) return res.status(404).json({ error: '剧本不存在' });
    res.json({ script });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/storyboard-prompts', async (req, res, next) => {
  try {
    const script = await getScript(req.params.id);
    if (!script) return res.status(404).json({ error: '剧本不存在' });
    const storyboardPrompts = await splitScriptToStoryboardPrompts(script);
    const updated = await updateScript(script.id, { storyboardPrompts });
    res.json({ script: updated, storyboardPrompts });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/export.txt', async (req, res, next) => {
  try {
    const script = await getScript(req.params.id);
    if (!script) return res.status(404).send('剧本不存在');
    res.type('text/plain; charset=utf-8');
    res.attachment(`${script.ideaTitle || 'script'}.txt`);
    res.send(formatScriptText(script));
  } catch (error) {
    next(error);
  }
});

function normalizeType(type) {
  return ['短视频', '剧情短片', '广告', '口播脚本'].includes(type) ? type : '短视频';
}

function formatScriptText(script) {
  const content = script.content || {};
  const acts = (content.acts || [])
    .map((act, index) => `${index + 1}. ${act.title}\n台词：${act.dialogue}\n镜头备注：${act.shotNote}`)
    .join('\n\n');
  return [
    `标题：${script.ideaTitle}`,
    `类型：${script.type}`,
    '',
    `总梗概：${content.synopsis || ''}`,
    '',
    `人物设定：${JSON.stringify(content.characters || [], null, 2)}`,
    '',
    `场景列表：${(content.scenes || []).join('、')}`,
    '',
    acts,
    '',
    `镜头备注：${(content.cameraNotes || []).join('\n')}`
  ].join('\n');
}

router.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || '剧本模块异常' });
});

export default router;
