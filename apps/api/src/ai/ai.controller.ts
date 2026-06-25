import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateJdDto, GenerateQuestionsDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
const { PDFParse } = require('pdf-parse');

@ApiTags('AI Features')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-jd')
  @ApiOperation({ summary: 'Generate a Job Description using Gemini AI' })
  async generateJd(@Body() dto: GenerateJdDto) {
    const jdText = await this.aiService.generateJobDescription(dto);
    return { success: true, data: jdText };
  }

  @Post('parse-resume')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Parse a resume PDF into structured candidate data' })
  async parseResume(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    let text = '';
    const isPdf = file.originalname?.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        text = (pdfData.text || '').substring(0, 10000); // Take up to 10k chars
      } catch (err) {
        throw new BadRequestException('Failed to extract text from the PDF file. Please ensure it is a valid, unencrypted PDF.');
      }
    } else {
      // Fallback if not a PDF (e.g. text file)
      text = file.buffer.toString('utf-8').substring(0, 5000);
    }
    
    const parsedData = await this.aiService.parseResumeText(text);
    return { success: true, data: parsedData };
  }

  @Get('jobs/:id/matches')
  @ApiOperation({ summary: 'Find top matching candidates for a job based on vector embeddings' })
  async findMatches(@Param('id') id: string) {
    const candidates = await this.aiService.findMatchingCandidatesForJob(id, 10);
    return { success: true, data: candidates };
  }

  @Post('generate-questions')
  @ApiOperation({ summary: 'Generate interview questions for a candidate applying to a job opening' })
  async generateQuestions(@Body() dto: GenerateQuestionsDto) {
    const questions = await this.aiService.generateInterviewQuestions(dto);
    return { success: true, data: questions };
  }
}
