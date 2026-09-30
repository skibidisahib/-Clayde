import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../../output/clips');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export async function generateClips(contentSource, rewardId) {
  const clips = [];

  try {
    const clipDurations = [15, 30, 60];

    for (let i = 0; i < clipDurations.length; i++) {
      const duration = clipDurations[i];
      const filename = `clip_${rewardId}_${duration}s_${Date.now()}.mp4`;
      const filepath = path.join(outputDir, filename);

      console.log(`🎬 Generating ${duration}s clip for reward ${rewardId}...`);

      await generateClip(contentSource, filepath, duration, i);

      clips.push({
        filename,
        filepath,
        duration,
        size: duration === 15 ? 'short' : duration === 30 ? 'medium' : 'long',
      });
    }

    console.log(`✅ Generated ${clips.length} clips`);
  } catch (error) {
    console.error('Error generating clips:', error);
  }

  return clips;
}

function generateClip(source, output, duration, startTime) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(source)
      .seekInput(startTime)
      .duration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        '-preset fast',
      ])
      .output(output);

    command.on('end', () => {
      console.log(`✅ Clip created: ${output}`);
      resolve();
    });

    command.on('error', (err) => {
      console.error('FFmpeg error:', err);
      resolve();
    });

    command.run();
  });
}

export async function addOverlay(clipPath, text, rewardTitle) {
  try {
    const overlayText = `${text}\n${rewardTitle}`;

    const command = ffmpeg()
      .input(clipPath)
      .videoFilter(
        `drawtext=text='${overlayText}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`
      )
      .output(clipPath.replace('.mp4', '_overlay.mp4'));

    return new Promise((resolve, reject) => {
      command.on('end', () => {
        resolve(clipPath.replace('.mp4', '_overlay.mp4'));
      });
      command.on('error', reject);
      command.run();
    });
  } catch (error) {
    console.error('Error adding overlay:', error);
    return clipPath;
  }
}

export async function addWatermark(clipPath, watermarkPath) {
  try {
    const command = ffmpeg()
      .input(clipPath)
      .input(watermarkPath)
      .complexFilter('[1:v]scale=200:200[wm];[0:v][wm]overlay=10:10[out]', ['out'])
      .outputOptions('-c:a copy')
      .output(clipPath.replace('.mp4', '_watermarked.mp4'));

    return new Promise((resolve, reject) => {
      command.on('end', () => {
        resolve(clipPath.replace('.mp4', '_watermarked.mp4'));
      });
      command.on('error', reject);
      command.run();
    });
  } catch (error) {
    console.error('Error adding watermark:', error);
    return clipPath;
  }
}
