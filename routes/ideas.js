import express from 'express';
import { addIdeas, listIdeas, selectIdea } from '../services/store.js';
import { generateIdeaOutlines } from '../services/ai_client.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json({ ideas: await listIdeas() });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const input = normalizeInput(req.body);
    const outlines = await generateIdeaOutlines(input);
    const ideas = await addIdeas(input, outlines);
    res.json({ ideas });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/select', async (req, res, next) => {
  try {
    const idea = await selectIdea(req.params.id);
    if (!idea) return res.status(404).json({ error: '创意不存在' });
    res.json({ idea, next: '/scripts' });
  } catch (error) {
    next(error);
  }
});

function normalizeInput(body) {
  return {
    category: String(body.category || '').trim(),
    style: String(body.style || '').trim(),
    duration: String(body.duration || '').trim(),
    audience: String(body.audience || '').trim(),
    keywords: String(body.keywords || '').trim(),
    count: Math.max(1, Math.min(Number(body.count || 4), 8))
  };
}

router.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || '创意模块异常' });
});

export default router;
