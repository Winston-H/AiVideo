import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import editorRouter from './routes/editor.js';
import ideasRouter from './routes/ideas.js';
import prototypesRouter from './routes/prototypes.js';
import scriptsRouter from './routes/scripts.js';
import storyboardsRouter from './routes/storyboards.js';
import videosRouter from './routes/videos.js';
import { ensureStorage } from './services/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

await ensureStorage();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

app.use('/api/ideas', ideasRouter);
app.use('/api/scripts', scriptsRouter);
app.use('/api/prototypes', prototypesRouter);
app.use('/api/storyboards', storyboardsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/editor', editorRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ai-video-studio' });
});

app.listen(port, host, () => {
  console.log(`AI Video Studio running at http://${host}:${port}`);
});
