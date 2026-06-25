import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private isR2Configured = false;
  private localUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const endpoint = process.env.R2_ENDPOINT;

    if (
      accessKeyId &&
      accessKeyId !== 'your_r2_access_key' &&
      secretAccessKey &&
      secretAccessKey !== 'your_r2_secret_key' &&
      bucketName &&
      endpoint
    ) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
      this.isR2Configured = true;
      this.logger.log('☁️ Cloudflare R2 Storage client initialized.');
    } else {
      this.logger.log('📂 Local Storage initialized. Files will be saved under: ' + this.localUploadDir);
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<{ url: string; key: string }> {
    const fileExtension = path.extname(file.originalname);
    const uniqueId = uuidv4();
    const key = `${folder}/${uniqueId}${fileExtension}`;

    if (this.isR2Configured && this.s3Client) {
      const bucketName = process.env.R2_BUCKET_NAME;
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );
      } catch (error) {
        this.logger.error('Error uploading to R2: ', error);
        throw new Error('Failed to upload file to R2 storage.');
      }
    } else {
      const destinationFolder = path.join(this.localUploadDir, folder);
      if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
      }

      const filePath = path.join(destinationFolder, `${uniqueId}${fileExtension}`);
      fs.writeFileSync(filePath, file.buffer);
    }

    const port = process.env.PORT ?? 4000;
    const apiPrefix = 'api';
    let baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || `http://localhost:${port}`;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    const url = `${baseUrl}/${apiPrefix}/storage/file/${folder}/${uniqueId}${fileExtension}`;
    return { url, key: `${folder}/${uniqueId}${fileExtension}` };
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isR2Configured && this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
          })
        );
      } catch (error) {
        this.logger.error('Error deleting from R2: ', error);
      }
    } else {
      const filePath = path.join(this.localUploadDir, key);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          this.logger.error('Error deleting local file: ', error);
        }
      }
    }
  }

  getLocalFilePath(key: string): string | null {
    const filePath = path.join(this.localUploadDir, key);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }

  async getFileStream(key: string): Promise<{ stream: any; contentType?: string } | null> {
    if (this.isR2Configured && this.s3Client) {
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
          })
        );
        return {
          stream: response.Body,
          contentType: response.ContentType,
        };
      } catch (error) {
        this.logger.error('Error fetching file from R2: ', error);
        return null;
      }
    } else {
      const filePath = path.join(this.localUploadDir, key);
      if (fs.existsSync(filePath)) {
        return {
          stream: fs.createReadStream(filePath),
        };
      }
      return null;
    }
  }
}
