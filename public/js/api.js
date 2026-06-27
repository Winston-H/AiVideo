export async function apiGet(path) {
  const res = await fetch(path);
  return parseResponse(res);
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return parseResponse(res);
}

async function parseResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}
