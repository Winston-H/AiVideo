import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve('storage');
const dirs = ['data', 'assets', 'assets/tk', 'scripts', 'storyboards', 'videos', 'projects'];
const ideasFile = path.join(root, 'data', 'ideas.json');
const scriptsFile = path.join(root, 'data', 'scripts.json');
const prototypesFile = path.join(root, 'data', 'prototypes.json');
const storyboardsFile = path.join(root, 'data', 'storyboards.json');
const videosFile = path.join(root, 'data', 'videos.json');
const editorProjectFile = path.join(root, 'projects', 'editor-project.json');

export async function ensureStorage() {
  await Promise.all(dirs.map((dir) => fs.mkdir(path.join(root, dir), { recursive: true })));
  try {
    await fs.access(ideasFile);
  } catch {
    await fs.writeFile(ideasFile, '[]\n', 'utf8');
  }
  try {
    await fs.access(scriptsFile);
  } catch {
    await fs.writeFile(scriptsFile, '[]\n', 'utf8');
  }
  try {
    await fs.access(prototypesFile);
  } catch {
    await fs.writeFile(prototypesFile, '[]\n', 'utf8');
  }
  try {
    await fs.access(storyboardsFile);
  } catch {
    await fs.writeFile(storyboardsFile, '[]\n', 'utf8');
  }
  try {
    await fs.access(videosFile);
  } catch {
    await fs.writeFile(videosFile, '[]\n', 'utf8');
  }
  try {
    await fs.access(editorProjectFile);
  } catch {
    await fs.writeFile(editorProjectFile, '{}\n', 'utf8');
  }
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function listIdeas() {
  await ensureStorage();
  return readJson(ideasFile, []);
}

export async function addIdeas(input, outlines) {
  const now = new Date().toISOString();
  const current = await listIdeas();
  const rows = outlines.map((outline, index) => ({
    id: randomUUID(),
    title: outline.title || `创意 ${index + 1}`,
    summary: outline.summary || '',
    hook: outline.hook || '',
    tags: outline.tags || [],
    input,
    selected: false,
    createdAt: now,
    updatedAt: now
  }));
  await writeJson(ideasFile, [...rows, ...current]);
  return rows;
}

export async function selectIdea(id) {
  const rows = await listIdeas();
  const next = rows.map((row) => ({
    ...row,
    selected: row.id === id,
    updatedAt: row.id === id ? new Date().toISOString() : row.updatedAt
  }));
  await writeJson(ideasFile, next);
  return next.find((row) => row.id === id) || null;
}

export async function getIdea(id) {
  const rows = await listIdeas();
  return rows.find((row) => row.id === id) || null;
}

export async function getSelectedIdea() {
  const rows = await listIdeas();
  return rows.find((row) => row.selected) || null;
}

export async function listScripts() {
  await ensureStorage();
  return readJson(scriptsFile, []);
}

export async function getScript(id) {
  const rows = await listScripts();
  return rows.find((row) => row.id === id) || null;
}

export async function getScriptByIdea(ideaId) {
  const rows = await listScripts();
  return rows.find((row) => row.ideaId === ideaId) || null;
}

export async function addScript(idea, type, content) {
  const now = new Date().toISOString();
  const rows = await listScripts();
  const script = {
    id: randomUUID(),
    ideaId: idea.id,
    ideaTitle: idea.title,
    type,
    content,
    storyboardPrompts: [],
    createdAt: now,
    updatedAt: now
  };
  await writeJson(scriptsFile, [script, ...rows.filter((row) => row.ideaId !== idea.id)]);
  return script;
}

export async function updateScript(id, patch) {
  const rows = await listScripts();
  const now = new Date().toISOString();
  let updated = null;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    updated = { ...row, ...patch, updatedAt: now };
    return updated;
  });
  await writeJson(scriptsFile, next);
  return updated;
}

export async function listPrototypes() {
  await ensureStorage();
  return readJson(prototypesFile, []);
}

export async function listPrototypesByScript(scriptId) {
  const rows = await listPrototypes();
  return rows.filter((row) => row.scriptId === scriptId).sort((a, b) => a.index - b.index);
}

export async function replacePrototypesForScript(scriptId, prototypes) {
  const rows = await listPrototypes();
  const next = [...prototypes, ...rows.filter((row) => row.scriptId !== scriptId)];
  await writeJson(prototypesFile, next);
  return prototypes;
}

export async function addPrototype(prototype) {
  const rows = await listPrototypes();
  await writeJson(prototypesFile, [prototype, ...rows]);
  return prototype;
}

export async function getPrototype(id) {
  const rows = await listPrototypes();
  return rows.find((row) => row.id === id) || null;
}

export async function updatePrototype(id, patch) {
  const rows = await listPrototypes();
  const now = new Date().toISOString();
  let updated = null;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    updated = { ...row, ...patch, updatedAt: now };
    return updated;
  });
  await writeJson(prototypesFile, next);
  return updated;
}

export async function listStoryboards() {
  await ensureStorage();
  return readJson(storyboardsFile, []);
}

export async function listStoryboardsByScript(scriptId) {
  const rows = await listStoryboards();
  return rows.filter((row) => row.scriptId === scriptId).sort((a, b) => a.index - b.index);
}

export async function addStoryboards(items) {
  const rows = await listStoryboards();
  await writeJson(storyboardsFile, [...items, ...rows]);
  return items;
}

export async function getStoryboard(id) {
  const rows = await listStoryboards();
  return rows.find((row) => row.id === id) || null;
}

export async function selectStoryboard(id) {
  const rows = await listStoryboards();
  let selected = null;
  const next = rows.map((row) => {
    const isSelected = row.id === id;
    const item = { ...row, selected: isSelected, videoSelected: isSelected };
    if (isSelected) selected = item;
    return item;
  });
  await writeJson(storyboardsFile, next);
  return selected;
}

export async function setStoryboardVideoSelected(id, selected) {
  const rows = await listStoryboards();
  let updated = null;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    updated = { ...row, videoSelected: Boolean(selected), selected: Boolean(selected) };
    return updated;
  });
  await writeJson(storyboardsFile, next);
  return updated;
}

export async function setStoryboardsVideoSelected(ids, selected) {
  const idSet = new Set(ids);
  const rows = await listStoryboards();
  const next = rows.map((row) => idSet.has(row.id) ? { ...row, videoSelected: Boolean(selected), selected: Boolean(selected) } : row);
  await writeJson(storyboardsFile, next);
  return next.filter((row) => idSet.has(row.id));
}

export async function deleteStoryboard(id) {
  const rows = await listStoryboards();
  const target = rows.find((row) => row.id === id);
  await writeJson(storyboardsFile, rows.filter((row) => row.id !== id));
  return target || null;
}

export async function getSelectedStoryboard() {
  const rows = await listStoryboards();
  return rows.find((row) => row.videoSelected || row.selected) || null;
}

export async function getStoryboardsByIds(ids) {
  const idSet = new Set(ids);
  const rows = await listStoryboards();
  return rows.filter((row) => idSet.has(row.id));
}

export async function getSelectedStoryboards() {
  const rows = await listStoryboards();
  return rows.filter((row) => row.videoSelected || row.selected);
}

export async function listVideos() {
  await ensureStorage();
  return readJson(videosFile, []);
}

export async function listVideosByScript(scriptId) {
  const rows = await listVideos();
  return rows.filter((row) => row.scriptId === scriptId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addVideo(video) {
  const rows = await listVideos();
  await writeJson(videosFile, [video, ...rows]);
  return video;
}

export async function getVideo(id) {
  const rows = await listVideos();
  return rows.find((row) => row.id === id) || null;
}

export async function updateVideo(id, patch) {
  const rows = await listVideos();
  const now = new Date().toISOString();
  let updated = null;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    updated = { ...row, ...patch, updatedAt: now };
    return updated;
  });
  await writeJson(videosFile, next);
  return updated;
}

export async function getEditorProject() {
  await ensureStorage();
  return readJson(editorProjectFile, {});
}

export async function saveEditorProject(project) {
  const next = { ...project, updatedAt: new Date().toISOString() };
  await writeJson(editorProjectFile, next);
  return next;
}
