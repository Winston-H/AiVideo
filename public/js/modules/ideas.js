import { apiGet, apiPost } from '../api.js';
import { setIdeas, setLoading, state } from '../state.js';
import { setBusy, showToast } from '../ui.js';

if (window.location.protocol === 'file:') {
  window.location.replace('http://localhost:3000/');
}

const form = document.querySelector('#ideaForm');
const scriptForm = document.querySelector('#scriptForm');
const list = document.querySelector('#ideasList');
const newIdeasGroup = document.querySelector('#newIdeasGroup');
const newIdeasList = document.querySelector('#newIdeasList');
const newIdeasCount = document.querySelector('#newIdeasCount');
const historyIdeasGroup = document.querySelector('#historyIdeasGroup');
const historyIdeasCount = document.querySelector('#historyIdeasCount');
const empty = document.querySelector('#emptyState');
const generateBtn = document.querySelector('#generateBtn');
const refreshBtn = document.querySelector('#refreshBtn');
const ideaStep = document.querySelector('#ideaStep');
const scriptStep = document.querySelector('#scriptStep');
const prototypeStep = document.querySelector('#prototypeStep');
const storyboardStep = document.querySelector('#storyboardStep');
const videoStep = document.querySelector('#videoStep');
const editorStep = document.querySelector('#editorStep');
const aiCreateStep = document.querySelector('#aiCreateStep');
const tkStep = document.querySelector('#tkStep');
const workflowSteps = document.querySelector('#workflowSteps');
const ideasSection = document.querySelector('#ideasSection');
const scriptsSection = document.querySelector('#scriptsSection');
const prototypesSection = document.querySelector('#prototypesSection');
const storyboardsSection = document.querySelector('#storyboardsSection');
const videosSection = document.querySelector('#videosSection');
const editorSection = document.querySelector('#editorSection');
const tkSection = document.querySelector('#tkSection');
const selectedIdeaBox = document.querySelector('#selectedIdeaBox');
const selectedScriptBox = document.querySelector('#selectedScriptBox');
const scriptGenerateBtn = document.querySelector('#scriptGenerateBtn');
const scriptEditor = document.querySelector('#scriptEditor');
const saveScriptBtn = document.querySelector('#saveScriptBtn');
const exportScriptBtn = document.querySelector('#exportScriptBtn');
const splitScriptBtn = document.querySelector('#splitScriptBtn');
const storyboardPromptBox = document.querySelector('#storyboardPromptBox');
const prototypeGenerateBtn = document.querySelector('#prototypeGenerateBtn');
const prototypeUploadBtn = document.querySelector('#prototypeUploadBtn');
const prototypeImageInput = document.querySelector('#prototypeImageInput');
const refreshPrototypeBtn = document.querySelector('#refreshPrototypeBtn');
const prototypeEmptyState = document.querySelector('#prototypeEmptyState');
const prototypeList = document.querySelector('#prototypeList');
const storyboardForm = document.querySelector('#storyboardForm');
const storyboardGenerateBtn = document.querySelector('#storyboardGenerateBtn');
const refreshStoryboardBtn = document.querySelector('#refreshStoryboardBtn');
const selectAllStoryboardBtn = document.querySelector('#selectAllStoryboardBtn');
const clearStoryboardBtn = document.querySelector('#clearStoryboardBtn');
const storyboardEmptyState = document.querySelector('#storyboardEmptyState');
const storyboardList = document.querySelector('#storyboardList');
const videoForm = document.querySelector('#videoForm');
const videoGenerateBtn = document.querySelector('#videoGenerateBtn');
const refreshVideoBtn = document.querySelector('#refreshVideoBtn');
const videoEmptyState = document.querySelector('#videoEmptyState');
const videoList = document.querySelector('#videoList');
const selectedStoryboardBox = document.querySelector('#selectedStoryboardBox');
const introTitle = document.querySelector('#introTitle');
const outroTitle = document.querySelector('#outroTitle');
const transitionMode = document.querySelector('#transitionMode');
const saveProjectBtn = document.querySelector('#saveProjectBtn');
const exportProjectBtn = document.querySelector('#exportProjectBtn');
const loadEditorBtn = document.querySelector('#loadEditorBtn');
const editorEmptyState = document.querySelector('#editorEmptyState');
const clipTrack = document.querySelector('#clipTrack');
const exportResult = document.querySelector('#exportResult');
const tkForm = document.querySelector('#tkForm');
const tkGenerateBtn = document.querySelector('#tkGenerateBtn');
const tkOptimizeBtn = document.querySelector('#tkOptimizeBtn');
const tkRefreshBtn = document.querySelector('#tkRefreshBtn');
const tkUploadBtn = document.querySelector('#tkUploadBtn');
const tkImageInput = document.querySelector('#tkImageInput');
const tkImagePreview = document.querySelector('#tkImagePreview');
const tkEmptyState = document.querySelector('#tkEmptyState');
const tkVideoList = document.querySelector('#tkVideoList');
const tkRunningTab = document.querySelector('#tkRunningTab');
const tkDoneTab = document.querySelector('#tkDoneTab');

let currentScript = null;
let currentPrototypes = [];
let currentStoryboards = [];
let currentVideos = [];
let currentTkVideos = [];
let tkImageDataUrl = '';
let videoProgressTimer = null;
let tkProgressTimer = null;
let tkQueueFilter = 'running';
let freshIdeaIds = new Set();
let editorClips = [];
let availableEditorVideos = [];

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(form).entries());
  await run(async () => {
    const data = await apiPost('/api/ideas/generate', input);
    freshIdeaIds = new Set(data.ideas.map((idea) => idea.id));
    setIdeas([...data.ideas, ...state.ideas]);
    render();
    showToast('创意已保存到本地');
  });
});

refreshBtn.addEventListener('click', loadIdeas);
ideaStep.addEventListener('click', () => showModule('ideas'));
scriptStep.addEventListener('click', () => showModule('scripts'));
prototypeStep.addEventListener('click', () => showModule('prototypes'));
storyboardStep.addEventListener('click', () => showModule('storyboards'));
videoStep.addEventListener('click', () => showModule('videos'));
editorStep.addEventListener('click', () => showModule('editor'));
aiCreateStep.addEventListener('click', () => showModule('ideas'));
tkStep.addEventListener('click', () => showModule('tk'));

scriptForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const idea = selectedIdea();
  if (!idea) return showToast('请先选择一个创意', 'error');
  const input = Object.fromEntries(new FormData(scriptForm).entries());
  await run(async () => {
    const data = await apiPost('/api/scripts/generate', { ideaId: idea.id, type: input.type });
    setScript(data.script);
    showToast('剧本已生成并保存');
  }, scriptGenerateBtn, '生成完整剧本');
});

saveScriptBtn.addEventListener('click', async () => {
  if (!currentScript) return;
  await run(async () => {
    const script = await putScript(currentScript.id, scriptEditor.value);
    setScript(script);
    showToast('剧本修改已保存');
  });
});

exportScriptBtn.addEventListener('click', () => {
  if (currentScript) window.open(`/api/scripts/${currentScript.id}/export.txt`, '_blank');
});

splitScriptBtn.addEventListener('click', async () => {
  if (!currentScript) return;
  await run(async () => {
    const data = await apiPost(`/api/scripts/${currentScript.id}/storyboard-prompts`, {});
    setScript(data.script);
    storyboardPromptBox.hidden = false;
    storyboardPromptBox.textContent = JSON.stringify(data.storyboardPrompts, null, 2);
    showModule('prototypes');
    showToast('分镜文案已保存，已进入草图模块');
  });
});

prototypeGenerateBtn.addEventListener('click', async () => {
  if (!currentScript) return showToast('请先生成剧本', 'error');
  await run(async () => {
    const data = await apiPost('/api/prototypes/generate', { scriptId: currentScript.id });
    setPrototypes(data.prototypes);
    showToast('镜头原型草图已保存到素材库');
  }, prototypeGenerateBtn, '生成镜头草图');
});

prototypeUploadBtn.addEventListener('click', () => prototypeImageInput.click());
prototypeImageInput.addEventListener('change', async () => {
  const file = prototypeImageInput.files?.[0];
  if (!file) return;
  if (!currentScript) return showToast('请先生成剧本', 'error');
  await run(async () => {
    const data = await apiPost('/api/prototypes/upload', {
      scriptId: currentScript.id,
      title: file.name.replace(/\.[^.]+$/, ''),
      imageDataUrl: await fileToDataUrl(file)
    });
    setPrototypes([...currentPrototypes, data.prototype]);
    showToast('本地图片已加入原型列表');
  }, prototypeUploadBtn, '上传本地图片');
  prototypeImageInput.value = '';
});

refreshPrototypeBtn.addEventListener('click', () => {
  if (currentScript) loadPrototypes(currentScript.id);
});

storyboardForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentScript || !currentPrototypes.length) return showToast('请先生成镜头原型草图', 'error');
  const input = Object.fromEntries(new FormData(storyboardForm).entries());
  await run(async () => {
    const data = await apiPost('/api/storyboards/generate', { ...input, scriptId: currentScript.id });
    setStoryboards([...data.storyboards, ...currentStoryboards]);
    showToast('分镜图已生成并保存');
  }, storyboardGenerateBtn, '批量生成分镜图');
});

refreshStoryboardBtn.addEventListener('click', () => {
  if (currentScript) loadStoryboards(currentScript.id);
});
selectAllStoryboardBtn.addEventListener('click', () => setStoryboardBatchSelection(true));
clearStoryboardBtn.addEventListener('click', () => setStoryboardBatchSelection(false));

videoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const selected = selectedStoryboards();
  if (!selected.length) return showToast('请先多选分镜图', 'error');
  const input = Object.fromEntries(new FormData(videoForm).entries());
  await run(async () => {
    const data = await apiPost('/api/videos/generate-batch', {
      ...input,
      storyboardIds: selected.map((item) => item.id)
    });
    const failedVideos = (data.errors || []).map((item) => ({
      id: `failed-${item.storyboardId || Date.now()}`,
      scriptId: currentScript.id,
      title: item.title || '视频任务创建失败',
      status: 'failed',
      progress: 0,
      error: item.error || '创建失败',
      createdAt: new Date().toISOString()
    }));
    setVideos([...data.videos, ...failedVideos, ...currentVideos]);
    const failed = data.errors?.length ? `，${data.errors.length} 个失败` : '';
    showToast(`${data.videos.length} 个视频任务已创建${failed}`);
  }, videoGenerateBtn, '批量生成视频片段');
});

refreshVideoBtn.addEventListener('click', async () => {
  await refreshVideos();
});

tkUploadBtn.addEventListener('click', () => tkImageInput.click());
tkImageInput.addEventListener('change', async () => {
  const file = tkImageInput.files?.[0];
  if (!file) return;
  tkImageDataUrl = await fileToDataUrl(file);
  tkImagePreview.src = tkImageDataUrl;
  tkImagePreview.hidden = false;
});
tkOptimizeBtn.addEventListener('click', async () => {
  const input = Object.fromEntries(new FormData(tkForm).entries());
  await run(async () => {
    const data = await apiPost('/api/videos/tk/optimize', { ...input, hasImage: Boolean(tkImageDataUrl || input.imageUrl) });
    tkForm.elements.prompt.value = data.prompt;
    showToast('提示词已优化');
  }, tkOptimizeBtn, '✦ AI 提示词优化');
});
tkForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(tkForm).entries());
  if (!input.prompt && !input.imageUrl && !tkImageDataUrl) return showToast('请填写提示词或上传参考图', 'error');
  const tempId = `creating-${Date.now()}`;
  setTkVideos([{
    id: tempId,
    scriptId: 'tk',
    title: input.prompt || 'TK 视频生成',
    prompt: input.prompt || 'TK 视频生成',
    status: 'submitting',
    progress: 1,
    createdAt: new Date().toISOString()
  }, ...currentTkVideos]);
  try {
    setBusy(tkGenerateBtn, true, '生成');
    const data = await apiPost('/api/videos/tk', { ...input, imageDataUrl: tkImageDataUrl });
    const hasTemp = currentTkVideos.some((item) => item.id === tempId);
    setTkVideos(hasTemp
      ? currentTkVideos.map((item) => item.id === tempId ? data.video : item)
      : [data.video, ...currentTkVideos]);
    showToast(data.note || 'TK 视频任务已创建');
  } catch (error) {
    const failed = { id: tempId, scriptId: 'tk', title: input.prompt || 'TK 视频生成', prompt: input.prompt || 'TK 视频生成', status: 'failed', progress: 0, error: error.message, createdAt: new Date().toISOString() };
    setTkVideos(currentTkVideos.some((item) => item.id === tempId)
      ? currentTkVideos.map((item) => item.id === tempId ? { ...item, status: 'failed', progress: 0, error: error.message } : item)
      : [failed, ...currentTkVideos]);
    showToast(error.message, 'error');
  } finally {
    setBusy(tkGenerateBtn, false, '生成');
  }
});
tkRefreshBtn.addEventListener('click', refreshTkVideos);
tkRunningTab.addEventListener('click', () => setTkQueueFilter('running'));
tkDoneTab.addEventListener('click', () => setTkQueueFilter('done'));

loadEditorBtn.addEventListener('click', loadEditor);
saveProjectBtn.addEventListener('click', () => saveEditor(false));
exportProjectBtn.addEventListener('click', () => saveEditor(true));

await loadIdeas();
await loadTkVideos();

async function loadIdeas() {
  await run(async () => {
    const data = await apiGet('/api/ideas');
    setIdeas(data.ideas);
    render();
    const idea = selectedIdea();
    if (idea) await loadScriptForIdea(idea.id);
  });
}

async function selectIdea(id) {
  await run(async () => {
    const data = await apiPost(`/api/ideas/${id}/select`, {});
    setIdeas(state.ideas.map((idea) => ({ ...idea, selected: idea.id === data.idea.id })));
    render();
    await loadScriptForIdea(data.idea.id);
    showModule('scripts');
    showToast('已选中，下一步将进入剧本模块');
  });
}

async function run(task, button = generateBtn, label = '生成创意') {
  try {
    setLoading(true);
    setBusy(button, true, label);
    await task();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setLoading(false);
    setBusy(button, false, label);
  }
}

function render() {
  empty.hidden = state.ideas.length > 0;
  const fresh = state.ideas.filter((idea) => freshIdeaIds.has(idea.id));
  const history = state.ideas.filter((idea) => !freshIdeaIds.has(idea.id));
  newIdeasGroup.hidden = fresh.length === 0;
  historyIdeasGroup.hidden = history.length === 0;
  historyIdeasGroup.open = false;
  newIdeasCount.textContent = `${fresh.length} 条`;
  historyIdeasCount.textContent = `${history.length} 条`;
  renderIdeaList(newIdeasList, fresh);
  renderIdeaList(list, history);
  const idea = selectedIdea();
  scriptStep.disabled = !idea;
  selectedIdeaBox.textContent = idea ? `${idea.title}\n${idea.summary}` : '请先从创意列表选择一个创意。';
}

function renderIdeaList(target, ideas) {
  target.innerHTML = ideas.map(renderIdea).join('');
  target.querySelectorAll('[data-select]').forEach((button) => {
    button.addEventListener('click', () => selectIdea(button.dataset.select));
  });
}

function renderIdea(idea) {
  const tags = idea.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  return `
    <article class="idea-item">
      <div class="idea-title">
        <span>${escapeHtml(idea.title)}</span>
        ${idea.selected ? '<span class="selected">已选中</span>' : ''}
      </div>
      <p class="idea-summary">${escapeHtml(idea.summary)}</p>
      <p class="idea-hook">${escapeHtml(idea.hook)}</p>
      <div class="idea-tags">${tags}</div>
      <div class="idea-actions">
        <button class="link-action" type="button" data-select="${idea.id}">选中并进入剧本</button>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function loadScriptForIdea(ideaId) {
  const data = await apiGet(`/api/scripts?ideaId=${encodeURIComponent(ideaId)}`);
  setScript(data.script);
  if (data.script) await loadPrototypes(data.script.id);
  if (data.script) await loadVideos(data.script.id);
}

async function putScript(id, content) {
  const res = await fetch(`/api/scripts/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '保存失败');
  return data.script;
}

function setScript(script) {
  currentScript = script;
  scriptEditor.value = script ? JSON.stringify(script.content, null, 2) : '';
  saveScriptBtn.disabled = !script;
  exportScriptBtn.disabled = !script;
  splitScriptBtn.disabled = !script;
  prototypeStep.disabled = !script;
  prototypeGenerateBtn.disabled = !script;
  prototypeUploadBtn.disabled = !script;
  refreshPrototypeBtn.disabled = !script;
  selectedScriptBox.textContent = script ? `${script.ideaTitle}\n${script.type}` : '请先生成剧本。';
  storyboardPromptBox.hidden = !script?.storyboardPrompts?.length;
  storyboardPromptBox.textContent = script?.storyboardPrompts?.length
    ? JSON.stringify(script.storyboardPrompts, null, 2)
    : '';
  if (!script) setPrototypes([]);
  if (!script) setStoryboards([]);
  if (!script) setVideos([]);
}

function selectedIdea() {
  return state.ideas.find((idea) => idea.selected) || null;
}

function showModule(name) {
  workflowSteps.hidden = name === 'tk';
  ideasSection.hidden = name !== 'ideas';
  scriptsSection.hidden = name !== 'scripts';
  prototypesSection.hidden = name !== 'prototypes';
  storyboardsSection.hidden = name !== 'storyboards';
  videosSection.hidden = name !== 'videos';
  editorSection.hidden = name !== 'editor';
  tkSection.hidden = name !== 'tk';
  ideaStep.classList.toggle('active', name === 'ideas');
  scriptStep.classList.toggle('active', name === 'scripts');
  prototypeStep.classList.toggle('active', name === 'prototypes');
  storyboardStep.classList.toggle('active', name === 'storyboards');
  videoStep.classList.toggle('active', name === 'videos');
  editorStep.classList.toggle('active', name === 'editor');
  aiCreateStep.classList.toggle('active', name !== 'tk');
  tkStep.classList.toggle('active', name === 'tk');
  if (name === 'editor') loadEditor();
  if (name === 'tk') loadTkVideos();
}

async function loadPrototypes(scriptId) {
  const data = await apiGet(`/api/prototypes?scriptId=${encodeURIComponent(scriptId)}`);
  setPrototypes(data.prototypes);
}

function setPrototypes(prototypes) {
  currentPrototypes = prototypes || [];
  prototypeEmptyState.hidden = currentPrototypes.length > 0;
  storyboardStep.disabled = currentPrototypes.length === 0;
  storyboardGenerateBtn.disabled = currentPrototypes.length === 0;
  refreshStoryboardBtn.disabled = currentPrototypes.length === 0;
  selectAllStoryboardBtn.disabled = currentPrototypes.length === 0;
  clearStoryboardBtn.disabled = currentPrototypes.length === 0;
  prototypeList.innerHTML = currentPrototypes.map(renderPrototype).join('');
  prototypeList.querySelectorAll('[data-save-prototype]').forEach((button) => {
    button.addEventListener('click', () => savePrototype(button.dataset.savePrototype));
  });
  if (currentScript) loadStoryboards(currentScript.id);
}

function renderPrototype(prototype) {
  return `
    <article class="prototype-item">
      <img src="${prototype.url}" alt="${escapeHtml(prototype.title)}" />
      <div class="prototype-fields">
        <input data-field="title" data-id="${prototype.id}" value="${escapeHtml(prototype.title)}" />
        <div class="grid-2">
          <input data-field="shotSize" data-id="${prototype.id}" value="${escapeHtml(prototype.shotSize)}" />
          <input data-field="composition" data-id="${prototype.id}" value="${escapeHtml(prototype.composition)}" />
        </div>
        <textarea data-field="description" data-id="${prototype.id}" rows="3">${escapeHtml(prototype.description)}</textarea>
        <button class="link-action" type="button" data-save-prototype="${prototype.id}">保存草图描述</button>
      </div>
    </article>
  `;
}

async function savePrototype(id) {
  const fields = Object.fromEntries(
    [...prototypeList.querySelectorAll(`[data-id="${id}"]`)].map((node) => [node.dataset.field, node.value])
  );
  await run(async () => {
    const prototype = await putPrototype(id, fields);
    setPrototypes(currentPrototypes.map((item) => item.id === prototype.id ? prototype : item));
    showToast('草图描述已更新');
  });
}

async function putPrototype(id, body) {
  const res = await fetch(`/api/prototypes/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '保存失败');
  return data.prototype;
}

async function loadStoryboards(scriptId) {
  const data = await apiGet(`/api/storyboards?scriptId=${encodeURIComponent(scriptId)}`);
  setStoryboards(data.storyboards);
}

function setStoryboards(storyboards) {
  currentStoryboards = storyboards || [];
  storyboardEmptyState.hidden = currentStoryboards.length > 0;
  const selected = selectedStoryboards();
  videoStep.disabled = !selected.length;
  videoGenerateBtn.disabled = !selected.length;
  refreshVideoBtn.disabled = !currentScript;
  selectedStoryboardBox.textContent = selected.length ? `已选择 ${selected.length} 张分镜图` : '请先多选分镜图。';
  storyboardList.innerHTML = currentStoryboards.map(renderStoryboard).join('');
  storyboardList.querySelectorAll('[data-toggle-storyboard]').forEach((input) => {
    input.addEventListener('change', () => toggleStoryboard(input.dataset.toggleStoryboard, input.checked));
  });
  storyboardList.querySelectorAll('[data-select-storyboard]').forEach((button) => {
    button.addEventListener('click', () => selectStoryboard(button.dataset.selectStoryboard));
  });
  storyboardList.querySelectorAll('[data-delete-storyboard]').forEach((button) => {
    button.addEventListener('click', () => deleteStoryboard(button.dataset.deleteStoryboard));
  });
}

function renderStoryboard(item) {
  const checked = item.videoSelected || item.selected ? 'checked' : '';
  return `
    <article class="storyboard-item">
      <img src="${item.url}" alt="${escapeHtml(item.title)}" />
      <div class="storyboard-body">
        <strong>${escapeHtml(item.index)}. ${escapeHtml(item.title)}</strong>
        ${checked ? '<span class="selected">已加入视频批量</span>' : ''}
        <label><input type="checkbox" data-toggle-storyboard="${item.id}" ${checked} /> 加入批量生成</label>
        <button class="link-action" type="button" data-select-storyboard="${item.id}">只选这一张</button>
        <a class="link-action" href="${item.url}" download>下载</a>
        <button class="link-action" type="button" data-delete-storyboard="${item.id}">删除</button>
      </div>
    </article>
  `;
}

async function selectStoryboard(id) {
  await run(async () => {
    const data = await apiPost(`/api/storyboards/${id}/select`, {});
    setStoryboards(currentStoryboards.map((item) => ({ ...item, selected: item.id === data.storyboard.id, videoSelected: item.id === data.storyboard.id })));
    showModule('videos');
    showToast('已选中，下一步图生视频只能使用分镜图');
  });
}

async function toggleStoryboard(id, selected) {
  await run(async () => {
    const data = await apiPost(`/api/storyboards/${id}/toggle-video`, { selected });
    setStoryboards(currentStoryboards.map((item) => item.id === id ? data.storyboard : item));
  });
}

async function setStoryboardBatchSelection(selected) {
  const ids = currentStoryboards.map((item) => item.id);
  if (!ids.length) return;
  await run(async () => {
    const data = await apiPost('/api/storyboards/select-video-batch', { ids, selected });
    const selectedMap = new Map(data.storyboards.map((item) => [item.id, item]));
    setStoryboards(currentStoryboards.map((item) => selectedMap.get(item.id) || item));
  });
}

function selectedStoryboards() {
  return currentStoryboards.filter((item) => item.videoSelected || item.selected);
}

async function deleteStoryboard(id) {
  await run(async () => {
    const res = await fetch(`/api/storyboards/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '删除失败');
    setStoryboards(currentStoryboards.filter((item) => item.id !== id));
    showToast('分镜图已删除');
  });
}

async function loadVideos(scriptId) {
  const data = await apiGet(`/api/videos?scriptId=${encodeURIComponent(scriptId)}`);
  setVideos(data.videos);
}

function setVideos(videos) {
  currentVideos = videos || [];
  videoEmptyState.hidden = currentVideos.length > 0;
  editorStep.disabled = !currentVideos.some((video) => video.localUrl);
  videoList.innerHTML = currentVideos.map(renderVideo).join('');
  videoList.querySelectorAll('[data-refresh-video]').forEach((button) => {
    button.addEventListener('click', () => refreshVideo(button.dataset.refreshVideo, button));
  });
  syncVideoProgressPolling();
}

function renderVideo(video) {
  const progress = Math.max(0, Math.min(100, Number(video.progress || 0)));
  const progressView = `
    <div class="progress-line">
      <span>${escapeHtml(video.status)} / ${progress}%</span>
      <div class="progress-track"><i style="width:${progress}%"></i></div>
    </div>
  `;
  const media = video.localUrl
    ? `<video src="${video.localUrl}" controls></video>`
    : `<div class="selected-box">${progressView}</div>`;
  return `
    <article class="video-item">
      <strong>${escapeHtml(video.title)}</strong>
      ${media}
      ${video.error ? `<div class="video-error">${escapeHtml(video.error)}</div>` : ''}
      ${video.localUrl ? `<a class="link-action" href="${video.localUrl}" download>下载 MP4</a>` : ''}
      ${video.status === 'failed' ? '' : `<button class="link-action" type="button" data-refresh-video="${video.id}">刷新状态</button>`}
    </article>
  `;
}

async function refreshVideos() {
  for (const video of currentVideos.filter(shouldPollVideo)) {
    await refreshVideo(video.id, refreshVideoBtn);
  }
}

async function refreshVideo(id, button = refreshVideoBtn) {
  await run(async () => {
    const data = await apiPost(`/api/videos/${id}/refresh`, {});
    setVideos(currentVideos.map((item) => item.id === id ? data.video : item));
    if (data.video.localUrl) await loadEditor();
    showToast('视频状态已刷新');
  }, button, '刷新状态');
}

function syncVideoProgressPolling() {
  const pending = currentVideos.some(shouldPollVideo);
  if (!pending && videoProgressTimer) {
    window.clearInterval(videoProgressTimer);
    videoProgressTimer = null;
  }
  if (pending && !videoProgressTimer) {
    videoProgressTimer = window.setInterval(refreshVideosSilently, 5000);
  }
}

async function refreshVideosSilently() {
  try {
    for (const video of currentVideos.filter(shouldPollVideo)) {
      const data = await apiPost(`/api/videos/${video.id}/refresh`, {});
      currentVideos = currentVideos.map((item) => item.id === video.id ? data.video : item);
      if (data.video.localUrl) await loadEditor();
    }
  } catch (error) {
    console.warn(error.message);
  }
  setVideos(currentVideos);
}

function shouldPollVideo(video) {
  return !video.localUrl && !['mocked', 'failed'].includes(video.status);
}

async function loadTkVideos() {
  const data = await apiGet('/api/videos?scriptId=tk');
  const transient = currentTkVideos.filter((item) => item.status === 'submitting');
  setTkVideos([...transient, ...data.videos]);
}

function setTkVideos(videos) {
  currentTkVideos = (videos || []).slice(0, 10);
  tkEmptyState.hidden = currentTkVideos.length > 0;
  const running = currentTkVideos.filter((item) => !isVideoDone(item));
  const done = currentTkVideos.filter(isVideoDone);
  tkRunningTab.textContent = `进行中 (${running.length})`;
  tkDoneTab.textContent = `已完成 (${done.length})`;
  tkRunningTab.classList.toggle('active', tkQueueFilter === 'running');
  tkDoneTab.classList.toggle('active', tkQueueFilter === 'done');
  tkVideoList.innerHTML = (tkQueueFilter === 'running' ? running : done).map(renderQueueVideo).join('');
  tkVideoList.querySelectorAll('[data-refresh-video]').forEach((button) => {
    button.addEventListener('click', () => refreshTkVideo(button.dataset.refreshVideo));
  });
  syncTkProgressPolling();
}

function setTkQueueFilter(filter) {
  tkQueueFilter = filter;
  setTkVideos(currentTkVideos);
}

function isVideoDone(video) {
  return Boolean(video.localUrl) || video.status === 'completed' || video.status === 'mocked';
}

function renderQueueVideo(video) {
  const progress = Math.max(0, Math.min(100, Number(video.progress || 0)));
  const title = video.prompt || video.title || 'TK 视频生成';
  const action = video.status === 'submitting'
    ? '<span class="queue-status">等待 Agnes 创建任务</span>'
    : video.localUrl
      ? `<a class="link-action" href="${video.localUrl}" download>下载 MP4</a>`
      : `<button class="link-action" type="button" data-refresh-video="${video.id}">刷新</button>`;
  const thumb = video.qaImageUrl
    ? `<img src="${video.qaImageUrl}" alt="质检帧" />`
    : video.localUrl
      ? `<video src="${video.localUrl}" muted></video>`
      : '<span>↻</span>';
  return `
    <article class="queue-item">
      <div class="queue-thumb">${thumb}</div>
      <div class="queue-main">
        <strong>${escapeHtml(title.slice(0, 32))}</strong>
        <span class="queue-status">${escapeHtml(statusText(video))}</span>
        <div class="queue-progress">
          <span>进度</span>
          <b>${progress}%</b>
          <div class="progress-track"><i style="width:${progress}%"></i></div>
        </div>
        <time>${escapeHtml(formatTime(video.createdAt))}</time>
        ${action}
      </div>
    </article>
  `;
}

function statusText(video) {
  return ({
    submitting: '正在提交任务',
    queued: '队列中',
    processing: '生成中',
    running: '生成中',
    completed: '已完成',
    failed: `失败${video.error ? `：${video.error}` : ''}`,
    mocked: '本地模拟'
  })[video.status] || video.status || '生成中';
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function refreshTkVideos() {
  for (const video of currentTkVideos.filter(shouldPollTkVideo)) {
    await refreshTkVideo(video.id);
  }
}

async function refreshTkVideo(id) {
  await run(async () => {
    const data = await apiPost(`/api/videos/${id}/refresh`, {});
    setTkVideos(currentTkVideos.map((item) => item.id === id ? data.video : item));
    showToast('TK 视频状态已刷新');
  }, tkRefreshBtn, '刷新状态');
}

function syncTkProgressPolling() {
  const pending = currentTkVideos.some(shouldPollTkVideo);
  if (!pending && tkProgressTimer) {
    window.clearInterval(tkProgressTimer);
    tkProgressTimer = null;
  }
  if (pending && !tkProgressTimer) {
    tkProgressTimer = window.setInterval(refreshTkVideosSilently, 5000);
  }
}

async function refreshTkVideosSilently() {
  try {
    for (const video of currentTkVideos.filter(shouldPollTkVideo)) {
      const data = await apiPost(`/api/videos/${video.id}/refresh`, {});
      currentTkVideos = currentTkVideos.map((item) => item.id === video.id ? data.video : item);
    }
  } catch (error) {
    console.warn(error.message);
  }
  setTkVideos(currentTkVideos);
}

function shouldPollTkVideo(video) {
  return !video.localUrl && !['mocked', 'failed', 'submitting'].includes(video.status);
}

async function loadEditor() {
  const data = await apiGet('/api/editor');
  availableEditorVideos = data.videos;
  introTitle.value = data.project?.introTitle || '';
  outroTitle.value = data.project?.outroTitle || '';
  transitionMode.value = data.project?.transition || 'cut';
  editorClips = data.project?.clips?.length ? data.project.clips : data.videos.map((video) => ({
    videoId: video.id,
    title: video.title,
    trimStart: 0,
    trimEnd: 0
  }));
  renderEditor(availableEditorVideos);
  if (data.project?.exported?.url) showExport(data.project.exported.url);
}

function renderEditor(videos) {
  const videoMap = new Map(videos.map((video) => [video.id, video]));
  editorClips = editorClips.filter((clip) => videoMap.has(clip.videoId));
  editorEmptyState.hidden = editorClips.length > 0;
  clipTrack.innerHTML = editorClips.map((clip, index) => renderClip(clip, index, videoMap.get(clip.videoId))).join('');
  clipTrack.querySelectorAll('.clip-row').forEach((row) => {
    row.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', row.dataset.index));
    row.addEventListener('dragover', (event) => event.preventDefault());
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      moveClip(Number(event.dataTransfer.getData('text/plain')), Number(row.dataset.index));
    });
  });
  clipTrack.querySelectorAll('[data-remove-clip]').forEach((button) => {
    button.addEventListener('click', () => {
      editorClips.splice(Number(button.dataset.removeClip), 1);
      renderEditor(videos);
    });
  });
}

function renderClip(clip, index, video) {
  return `
    <div class="clip-row" draggable="true" data-index="${index}">
      <strong>${index + 1}. ${escapeHtml(video.title)}</strong>
      <label>开始 <input data-clip="${index}" data-clip-field="trimStart" type="number" min="0" value="${clip.trimStart || 0}" /></label>
      <label>结束 <input data-clip="${index}" data-clip-field="trimEnd" type="number" min="0" value="${clip.trimEnd || 0}" /></label>
      <button class="link-action" type="button" data-remove-clip="${index}">移除</button>
    </div>
  `;
}

function moveClip(from, to) {
  collectClipInputs();
  const [clip] = editorClips.splice(from, 1);
  editorClips.splice(to, 0, clip);
  renderEditor(availableEditorVideos);
}

async function saveEditor(shouldExport) {
  collectClipInputs();
  const body = {
    clips: editorClips,
    introTitle: introTitle.value,
    outroTitle: outroTitle.value,
    transition: transitionMode.value
  };
  await run(async () => {
    const data = await apiPost(shouldExport ? '/api/editor/export' : '/api/editor/save', body);
    if (data.exported?.url) showExport(data.exported.url);
    showToast(shouldExport ? '成片已导出' : '剪辑工程已保存');
  }, shouldExport ? exportProjectBtn : saveProjectBtn, shouldExport ? '导出完整 MP4' : '保存剪辑工程');
}

function collectClipInputs() {
  clipTrack.querySelectorAll('[data-clip]').forEach((input) => {
    editorClips[Number(input.dataset.clip)][input.dataset.clipField] = Number(input.value || 0);
  });
}

function showExport(url) {
  exportResult.hidden = false;
  exportResult.innerHTML = `<a class="link-action" href="${url}" download>下载成片 MP4</a>`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
