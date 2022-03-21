import express from 'express';
import { createServer } from 'http';
import multer from 'multer';
import { convert } from './ffmpeg-convert';
import { access, constants, createReadStream, existsSync, mkdirSync } from 'fs';

const app = express();
const server = createServer(app);

// Uploads folder
const upload_folder = './uploads';

function customStorage(): multer.StorageEngine {
  return {
    _handleFile: (req: Express.Request, file: Express.Multer.File, cb: (error?: any, info?: Partial<Express.Multer.File>) => void) => {
      // Check file sended, ends with .mp4 and mime is mp4
      if (!file || !file.originalname.endsWith('.mp4') || file.mimetype !== 'video/mp4') {
        return cb('Wrong type');
      }

      // Get folder to storage
      const filename = file.originalname.substring(0, file.originalname.length - 4);
      const folder = `${upload_folder}/${filename}`;

      // Check for exists
      if (existsSync(folder)) {
        if (existsSync(folder + '/output.m3u8')) {
          return cb('Exists');
        }
        // may be folder exists but not converted
      } else {
        // Creating folder
        mkdirSync(folder, { recursive: true });
      }

      // convert stream to m3u8
      convert(file.stream, folder).then(() => {
        cb(null, { filename });
      }).catch((e) => {
        console.error(e);
        cb('Failed convert');
      });
    },
    _removeFile: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null) => void) => {
      // @ts-ignore
      delete file.filename;
      cb(null);
    },
  };
}

const upload = multer({ storage: customStorage() });

async function bootstrap() {
  app.get('/', (req, res) => res.sendFile(__dirname + '/upload.html'));

  app.get('/player', (req, res) => {
    if (req.query.file) {
      return res.sendFile(__dirname + '/player.html');
    } else {
      // Not need show player if no file in query
      return res.status(404).end();
    }
  });

  app.get('/videos/*', (req, res) => {
    // check is `/videos/$name.$ext` in url
    const match = req.url.match(/videos\/(.*)\.(.*)/);
    if (!match || !['ts', 'm3u8'].includes(match[2])) {
      return res.status(400).end();
    }

    const file = `${upload_folder}/${match[1]}.${match[1]}`;

    // check access and existing
    const hasAccess = new Promise<boolean>((resolve) => {
      access(file, constants.F_OK, function (err) {
        if (err) {
          return resolve(false);
        }
        return resolve(true);
      });
    });

    if (!hasAccess) {
      return res.status(400).end();
    }

    const stream = createReadStream(file);

    const type = match[2] === 'm3u8' ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

    res.setHeader('Content-Type', type);
    stream.pipe(res);
  });

  app.post('/upload', upload.single('file'), function (req, res) {
    if (!req.file) {
      return res.status(400).end();
    }
    return res.send({ link: '/player?file=' + req.file.filename });
  });

  server.listen(3000, () => {
    console.log('listening on *:3000');
  });
}

bootstrap();
