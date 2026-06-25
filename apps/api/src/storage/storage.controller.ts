import { Controller, Get, Param, Res, NotFoundException, StreamableFile } from '@nestjs/common';
import { StorageService } from './storage.service';
import * as path from 'path';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('file/:folder/:filename')
  async getFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: any
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

    if (!fileData.stream) {
      throw new NotFoundException('File stream is unavailable');
    }

    if (typeof fileData.stream.transformToByteArray === 'function') {
      try {
        const bytes = await fileData.stream.transformToByteArray();
        return new StreamableFile(Buffer.from(bytes));
      } catch (error) {
        throw new NotFoundException('Could not read file stream');
      }
    }

    return new StreamableFile(fileData.stream);
  }
}

