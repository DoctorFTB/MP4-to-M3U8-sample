import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

// import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
//
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Convert stream to m3u8 files
 */
export function convert(stream: Readable, folder: string) {
  return new Promise<void>((resolve, reject) => {
    const convert = ffmpeg(stream, { timeout: 432000 });

    convert.addOptions([
      '-profile:v baseline',
      '-level 3.0',
      '-start_number 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-f hls',
    ]);

    convert.output(folder + '/output.m3u8');

    convert.on('end', () => resolve());
    convert.on('error', (...args) => {
      console.error(...args);
      reject();
    });

    convert.run();
  });
}
