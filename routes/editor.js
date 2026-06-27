import express from 'express';
import { exportEditorProject } from '../services/editor_exporter.js';
import { getEditorProject, listVideos, saveEditorProject } from '../services/store.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const videos = await listVideos();
    res.json({ project: await getEditorProject(), videos: videos.filter((video) => video.localUrl) });
  } catch (error) {
    next(error);
  }
});

router.post('/save', async (req, res, next) => {
  try {
    res.json({ project: await saveEditorProject(normalizeProject(req.body)) });
  } catch (error) {
    next(error);
  }
});

router.post('/export', async (req, res, next) => {
  try {
    const project = await saveEditorProject(normalizeProject(req.body));
    const exported = await exportEditorProject(project, await listVideos());
    res.json({ project: await saveEditorProject({ ...project, exported }), exported });
  } catch (error) {
    next(error);
  }
});

function normalizeProject(body) {
  return {
    clips: Array.isArray(body.clips) ? body.clips.map((clip, index) => ({
      videoId: String(clip.videoId || ''),
      title: String(clip.title || `片段 ${index + 1}`),
      trimStart: Number(clip.trimStart || 0),
      trimEnd: Number(clip.trimEnd || 0)
    })).filter((clip) => clip.videoId) : [],
    introTitle: String(body.introTitle || '').trim(),
    outroTitle: String(body.outroTitle || '').trim(),
    transition: String(body.transition || 'cut')
  };
}

router.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || '剪辑导出异常' });
});

export default router;
