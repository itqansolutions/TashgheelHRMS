import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { StorageService } from './storage.service';
import * as path from 'path';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('file/:folder/:filename')
  async getFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: any
  ) {
    const key = `${folder}/${filename}`;
    const fileData = await this.storageService.getFileStream(key);

    if (!fileData) {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(filename).toLowerCase();
    let contentType = fileData.contentType || 'application/octet-stream';

    if (!fileData.contentType) {
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.txt':
          contentType = 'text/plain';
          break;
      }
    }

    res.setHeader('Content-Type', contentType);

    if (fileData.stream && typeof fileData.stream.pipe === 'function') {
      fileData.stream.pipe(res);
    } else if (fileData.stream && typeof fileData.stream.transformToByteArray === 'function') {
      const bytes = await fileData.stream.transformToByteArray();
      res.send(Buffer.from(bytes));
    } else {
      res.send(fileData.stream);
    }
  }
}
