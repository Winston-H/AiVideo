import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const outDir = path.resolve('storage/projects/exports');
const tmpDir = path.resolve('storage/projects/tmp');
const exportSize = { width: 1920, height: 1080 };

export async function exportEditorProject(project, allVideos) {
  const clips = (project.clips || [])
    .map((clip) => ({ ...clip, source: allVideos.find((video) => video.id === clip.videoId) }))
    .filter((clip) => clip.source?.filePath);
  if (!clips.length) throw new Error('没有可导出的本地 MP4 片段');

  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });

  const segmentPaths = [];
  if (project.introTitle) {
    segmentPaths.push(await makeTitleClip('intro', project.introTitle));
  }
  for (const [index, clip] of clips.entries()) {
    segmentPaths.push(await makeSegment(index, clip));
  }
  if (project.outroTitle) {
    segmentPaths.push(await makeTitleClip('outro', project.outroTitle));
  }

  const listPath = path.join(tmpDir, `concat-${Date.now()}.txt`);
  await fs.writeFile(listPath, segmentPaths.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'), 'utf8');

  const outPath = path.join(outDir, `final-${Date.now()}.mp4`);
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
  await Promise.all([listPath, ...segmentPaths].map((file) => fs.unlink(file).catch(() => {})));
  return { filePath: outPath, url: `/storage/projects/exports/${path.basename(outPath)}` };
}

async function makeSegment(index, clip) {
  const outPath = path.join(tmpDir, `clip-${Date.now()}-${index}.mp4`);
  const audio = await hasAudio(clip.source.filePath);
  const args = ['-y'];
  if (Number(clip.trimStart) > 0) args.push('-ss', String(clip.trimStart));
  args.push('-i', clip.source.filePath);
  if (!audio) args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
  if (Number(clip.trimEnd) > Number(clip.trimStart)) {
    args.push('-t', String(Number(clip.trimEnd) - Number(clip.trimStart)));
  }
  args.push('-map', '0:v:0', '-map', audio ? '0:a:0' : '1:a:0');
  args.push('-vf', `scale=${exportSize.width}:${exportSize.height}:force_original_aspect_ratio=decrease,pad=${exportSize.width}:${exportSize.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`);
  args.push('-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-shortest', outPath);
  await runFfmpeg(args);
  return outPath;
}

async function makeTitleClip(kind, title) {
  const outPath = path.join(tmpDir, `${kind}-${Date.now()}.mp4`);
  const safeTitle = String(title).replace(/[:'\\]/g, ' ');
  await runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x0b0d10:s=${exportSize.width}x${exportSize.height}:d=2`,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-vf', `drawtext=text='${safeTitle}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2,format=yuv420p`,
    '-r', '24',
    '-t', '2',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-shortest',
    outPath
  ]);
  return outPath;
}

function hasAudio(filePath) {
  return new Promise((resolve) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_type',
      '-of', 'csv=p=0',
      filePath
    ]);
    let stdout = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.on('error', () => resolve(false));
    child.on('close', () => resolve(stdout.includes('audio')));
  });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args);
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code) reject(new Error(stderr.split('\n').slice(-8).join('\n') || `ffmpeg exited ${code}`));
      else resolve();
    });
  });
}
