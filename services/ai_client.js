import apiConfig from '../config/api_config.js';

const seedIdeas = [
  ['反差开场', '用一个反常识问题切入，快速制造观看理由。'],
  ['人物困境', '围绕一个明确人物目标推进，结尾留出反转。'],
  ['三段递进', '用起因、升级、结果组织短视频节奏。'],
  ['场景实验', '把关键词放进一个强场景，让画面先成立。']
];

export async function generateIdeaOutlines(input) {
  if (apiConfig.textModel.baseUrl && apiConfig.textModel.apiKey) {
    return callTextModel(input);
  }
  return localIdeaOutlines(input);
}

export async function generateStructuredScript(idea, type) {
  const prompt = `基于短视频创意生成结构化剧本。只输出 JSON，不要 Markdown。JSON 字段必须为 synopsis, characters, scenes, acts, cameraNotes。acts 是数组，每项包含 title, dialogue, shotNote。类型：${type}。创意：${JSON.stringify(idea)}`;
  if (apiConfig.textModel.baseUrl && apiConfig.textModel.apiKey) {
    return callTextJson(prompt);
  }
  return localStructuredScript(idea, type);
}

export async function splitScriptToStoryboardPrompts(script) {
  const prompt = `把以下结构化剧本拆解为分镜文案数组。只输出 JSON 数组，每项包含 index, title, visual, camera, narration。剧本：${JSON.stringify(script.content)}`;
  if (apiConfig.textModel.baseUrl && apiConfig.textModel.apiKey) {
    return callTextJson(prompt);
  }
  return localStoryboardPrompts(script);
}

async function callTextModel(input) {
  const prompt = `按 JSON 数组输出 ${input.count} 条短视频创意，每条包含 title, summary, hook, tags。输入：${JSON.stringify(input)}`;
  return callTextJson(prompt);
}

async function callTextJson(prompt) {
  const res = await fetch(openAiEndpoint(apiConfig.textModel.baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiConfig.textModel.apiKey}`
    },
    body: JSON.stringify({
      model: apiConfig.textModel.model,
      messages: [
        { role: 'system', content: '你只输出合法 JSON，不要解释，不要 Markdown。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`文本模型请求失败：${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '[]';
  return JSON.parse(cleanJsonText(text));
}

function cleanJsonText(text) {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
}

function openAiEndpoint(baseUrl, path) {
  const base = baseUrl.replace(/\/$/, '');
  return base.endsWith(path) ? base : `${base}${path}`;
}

function localIdeaOutlines(input) {
  const count = Math.max(1, Math.min(Number(input.count || 4), 8));
  return Array.from({ length: count }, (_, index) => {
    const [mode, note] = seedIdeas[index % seedIdeas.length];
    const keyword = input.keywords || '核心主题';
    return {
      title: `${mode}：${keyword}`,
      summary: `${input.category || '泛题材'} / ${input.style || '自然风格'} / ${input.duration || '60秒'}，面向 ${input.audience || '大众受众'} 的短视频创意。${note}`,
      hook: `如果把「${keyword}」换一种方式讲，观众会在前 3 秒留下来吗？`,
      tags: [input.category, input.style, input.audience].filter(Boolean)
    };
  });
}

function localStructuredScript(idea, type) {
  return {
    synopsis: `${idea.title}：${idea.summary}`,
    characters: [
      { name: '主角', description: '承担核心目标和情绪变化的人物' },
      { name: '旁白', description: '负责压缩信息、推进节奏' }
    ],
    scenes: ['开场钩子', '冲突升级', '结果反转'],
    acts: [
      {
        title: '第一幕：三秒钩子',
        dialogue: idea.hook || '一个反常识问题打开故事。',
        shotNote: '近景，快速切入人物或关键物件。'
      },
      {
        title: '第二幕：信息递进',
        dialogue: `围绕「${idea.input?.keywords || idea.title}」给出具体场景和冲突。`,
        shotNote: '中景，穿插动作和环境细节。'
      },
      {
        title: '第三幕：结尾转化',
        dialogue: '用一句明确结论收束，并引导下一步行动。',
        shotNote: '稳定构图，留出字幕和视觉记忆点。'
      }
    ],
    cameraNotes: [`类型：${type}`, '节奏短促，镜头备注优先服务后续分镜绘图。']
  };
}

function localStoryboardPrompts(script) {
  return (script.content.acts || []).map((act, index) => ({
    index: index + 1,
    title: act.title,
    visual: act.shotNote,
    camera: '保持主体清晰，构图简洁，预留字幕安全区。',
    narration: act.dialogue
  }));
}
