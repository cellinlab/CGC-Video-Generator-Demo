const { createCanvas } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const moment = require('moment');

const path = require('path');
const fs = require('fs');

const width = 640;
const height = 480;
const fps = 30;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

/**
 * 整体思路：
 * 基础
 *  1. 使用 canvas 动态生成每一帧的图片
 *  2. 使用 ffmpeg 将图片合成视频
 * 进阶
 *  3. 直接使用 ffmepeg 推流到 rtmp 服务器
 */

/**
 * 生成每一帧
 */
const gerneateFrame = async (frameNum) => {
  const time = moment().format('YYYY-MM-DD HH:mm:ss');
  const text = `frame: ${frameNum}, time: ${time}`;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.fillText(text, 10, height / 2);

  const filename = `frame-${frameNum.toString().padStart(5, '0')}.png`;
  const filepath = path.join(__dirname, 'output', filename);

  await saveFrame(filepath);
  console.log(`frame ${frameNum} generated`);
};

/**
 * 保存每一帧
 * @param {string} filepath
 */
const saveFrame = (filepath) => {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filepath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
      resolve();
    });
  });
};

/**
 * 生成视频
 */
const generateVideo = () => {
  const cmd = ffmpeg()
    .input(path.join(__dirname, 'output', 'frame-%05d.png'))
    .inputFPS(fps)
    .videoCodec('libx264')
    .output(path.join(__dirname, 'output', 'output.mp4'))
    .on('start', () => {
      console.log('video generating...');
    })
    .on('progress', (progress) => {
      console.log(`video progress: ${progress.percent}%`);
    })
    .on('end', () => {
      console.log('video generated');
    })
    .on('error', (err) => {
      console.log('video error:', err);
    });
  cmd.run();
};


const generateFrames = async () => {
  for (let i = 0; i < 100; i++) {
    await gerneateFrame(i);
  }

  generateVideo();
};

generateFrames();

