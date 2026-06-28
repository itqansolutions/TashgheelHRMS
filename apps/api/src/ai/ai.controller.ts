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
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
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
    try {
      const jdText = await this.aiService.generateJobDescription(dto);
      return { success: true, data: jdText };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to generate Job Description');
    }
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
    
    let parsedData;
    try {
      parsedData = await this.aiService.parseResumeText(text);
    } catch (error: any) {
      throw new BadRequestException(`AI Resume Parser failed: ${error.message || error}`);
    }
    return { success: true, data: parsedData };
  }

  @Get('jobs/:id/matches')
  @ApiOperation({ summary: 'Find top matching candidates for a job based on vector embeddings' })
  async findMatches(@Param('id') id: string, @Query('poolId') poolId?: string) {
    const candidates = await this.aiService.findMatchingCandidatesForJob(id, 10, poolId);
    return { success: true, data: candidates };
  }

  @Get('jobs/:jobId/candidates/:candidateId/report')
  @ApiOperation({ summary: 'Get detailed AI matching explanation report for a candidate and job opening' })
  async getMatchingReport(
    @Param('jobId') jobId: string,
    @Param('candidateId') candidateId: string,
  ) {
    try {
      const report = await this.aiService.explainCandidateMatch(jobId, candidateId);
      return { success: true, data: report };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to generate AI matching report');
    }
  }

  @Get('candidates/:candidateId/jobs')
  @ApiOperation({ summary: 'Find recommended jobs for a candidate based on vector embeddings' })
  async findMatchingJobs(@Param('candidateId') candidateId: string) {
    try {
      const jobs = await this.aiService.findMatchingJobsForCandidate(candidateId, 10);
      return { success: true, data: jobs };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to find recommended jobs');
    }
  }

  @Post('jobs/:jobId/shortlist')
  @ApiOperation({ summary: 'Generate AI shortlist of top 5 candidates' })
  async generateShortlist(@Param('jobId') jobId: string) {
    try {
      const shortlist = await this.aiService.generateAiShortlist(jobId);
      return { success: true, data: shortlist };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to generate AI shortlist');
    }
  }

  @Post('jobs/:jobId/compare')
  @ApiOperation({ summary: 'Compare up to 3 candidates side-by-side for a job opening' })
  async compare(
    @Param('jobId') jobId: string,
    @Body('candidateIds') candidateIds: string[],
  ) {
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw new BadRequestException('Candidate IDs must be provided as an array');
    }
    try {
      const comparison = await this.aiService.compareCandidates(jobId, candidateIds);
      return { success: true, data: comparison };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to compare candidates');
    }
  }

  @Post('jobs/:jobId/hiring-recommendation')
  @ApiOperation({ summary: 'Generate AI hiring recommendation confidence for a candidate' })
  async generateRecommendation(
    @Param('jobId') jobId: string,
    @Body('candidateId') candidateId: string,
  ) {
    if (!candidateId) {
      throw new BadRequestException('candidateId is required');
    }
    try {
      const recommendation = await this.aiService.generateHiringRecommendation(jobId, candidateId);
      return { success: true, data: recommendation };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to generate hiring recommendation');
    }
  }

  @Post('generate-questions')
  @ApiOperation({ summary: 'Generate interview questions for a candidate applying to a job opening' })
  async generateQuestions(@Body() dto: GenerateQuestionsDto) {
    const questions = await this.aiService.generateInterviewQuestions(dto);
    return { success: true, data: questions };
  }

  @Post('jobs/:jobId/assistant')
  @ApiOperation({ summary: 'Chat with the AI Recruiter Assistant about matching candidates' })
  async chatWithAssistant(
    @Param('jobId') jobId: string,
    @Body('message') message: string,
  ) {
    if (!message) {
      throw new BadRequestException('Message body is required');
    }
    try {
      const response = await this.aiService.askRecruiterAssistant(jobId, message);
      return { success: true, data: response };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to get response from AI Assistant');
    }
  }

  @Get('candidates/:candidateId/cv-score')
  @ApiOperation({ summary: 'Get AI CV Quality Score for a candidate' })
  async getCvScore(@Param('candidateId') candidateId: string) {
    try {
      const score = await this.aiService.getCvQualityScore(candidateId);
      return { success: true, data: score };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to get CV quality score');
    }
  }

  @Post('jobs/:jobId/client-pack')
  @ApiOperation({ summary: 'Export professional client submission pack PDF' })
  async exportClientPack(
    @Param('jobId') jobId: string,
    @Body('candidateIds') candidateIds: string[],
    @Res() res: Response,
  ) {
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw new BadRequestException('Candidate IDs are required');
    }
    try {
      const pdfBuffer = await this.aiService.generateClientSubmissionPack(jobId, candidateIds);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=Client_Submission_Pack.pdf',
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to generate Client Submission Pack');
    }
  }
}

