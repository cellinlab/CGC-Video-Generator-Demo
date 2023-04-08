const { createCanvas } = require('canvas');
const ffmepeg = require('fluent-ffmpeg');
const moment = require('moment');

const { spawn } = require('child_process');

const width = 640;
const height = 480;
const fps = 15;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

const generateFrame = () => {
  const time = moment().format('YYYY-MM-DD HH:mm:ss');
  const text = `Live: ${time}`;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.fillText(text, 10, height / 2);
}

/**
 * 将每一帧推流到服务器
 */
const timeToLive = async () => {
  const cmd = ffmepeg()
    .input('pipe:0')
    .inputFPS(fps)
    .videoCodec('libx264')
    .size(`${width}x${height}`)
    .format('image2pipe')
    .output('rtmp://192.168.0.185:1935/livehime')
    .outputOptions([
      '-f flv',
      '-b:v 500k',
      '-preset ultrafast',
    ]);

  cmd.run();

  cmd.on('error', (err) => {
    console.log(`An error occurred: ${err.message}`);
  });

  cmd.on('end', () => {
    console.log('Processing finished !');
  });

  cmd.on('start', async (commandLine) => {
    console.log(`Spawned Ffmpeg with command: ${commandLine}`);

    const args = commandLine.split(' ').slice(1);
    const process = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });

    process.on('exit', (code, signal) => {
      console.log(`child process exited with code ${code} and signal ${signal}`);
      if (process.stdin) {
        process.stdin.end();
      }
      if (process.stdout) {
        process.stdout.destroy();
      }
      if (process.stderr) {
        process.stderr.destroy();
      }
      if (!process.killed) {
        process.kill();
      }
    });

    process.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });


    const sendFrame = async () => {
      generateFrame();

      const stream = canvas.createPNGStream();

      stream.pipe(process.stdin, { end: false });

      await new Promise((resolve) => setTimeout(resolve, 1000 / (fps / 2)));
      sendFrame();
    };

    sendFrame();
  });
}

timeToLive();
