import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../database/database.service';
import { GenerateJdDto } from './dto/ai.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generates a 768-dimensional embedding vector for a given text using Gemini.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      return [];
    }
  }

  /**
   * Generates a comprehensive Job Description.
   */
  async generateJobDescription(dto: GenerateJdDto): Promise<string> {
    try {
      const prompt = `
        You are an expert HR Recruiter. Write a professional Job Description for the following role:
        Title: ${dto.title}
        Department: ${dto.department || 'Not specified'}
        Additional Keywords/Requirements: ${dto.keywords || 'None'}

        Format the response in clean Markdown. Include the following sections:
        - Job Summary
        - Key Responsibilities
        - Required Qualifications
        - Preferred Qualifications
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || '';
    } catch (error) {
      this.logger.error('Failed to generate JD', error);
      throw new Error('Failed to generate Job Description from AI.');
    }
  }

  /**
   * Parses a resume text into structured JSON data.
   */
  async parseResumeText(text: string) {
    try {
      const prompt = `
        You are an expert AI Resume Parser. Extract the following information from the resume text provided below.
        Return the result STRICTLY as a JSON object with no markdown formatting or backticks.
        Ensure the JSON has exactly these keys:
        - firstName (string)
        - lastName (string)
        - email (string)
        - phone (string)
        - skills (array of strings)
        - aiSummary (string: a concise 2-sentence professional summary of the candidate)

        Resume Text:
        ${text}
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text || '{}';
      // Clean markdown block if the model included it
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error('Failed to parse resume', error);
      throw new Error('Failed to parse resume via AI.');
    }
  }

  /**
   * Sync Candidate Embedding to DB using raw SQL (pgvector).
   */
  async syncCandidateEmbedding(candidateId: string, textToEmbed: string) {
    const vector = await this.generateEmbedding(textToEmbed);
    if (vector.length === 0) return;

    // Convert array to string format expected by pgvector '[1.0, 2.0, ...]'
    const vectorString = `[${vector.join(',')}]`;

    await this.db.$executeRawUnsafe(
      `UPDATE "candidates" SET embedding = $1::vector WHERE id = $2`,
      vectorString,
      candidateId
    );
  }

  /**
   * Sync Job Opening Embedding to DB using raw SQL (pgvector).
   */
  async syncJobOpeningEmbedding(jobId: string, textToEmbed: string) {
    const vector = await this.generateEmbedding(textToEmbed);
    if (vector.length === 0) return;

    const vectorString = `[${vector.join(',')}]`;

    await this.db.$executeRawUnsafe(
      `UPDATE "job_openings" SET embedding = $1::vector WHERE id = $2`,
      vectorString,
      jobId
    );
  }

  /**
   * Match candidates against a Job Opening's embedding using Cosine Distance (<=>).
   * Note: Cosine distance is 0 for identical vectors, so smaller is better. We sort by distance ASC.
   */
  async findMatchingCandidatesForJob(jobId: string, limit = 10) {
    // We assume the job already has an embedding
    const candidates = await this.db.$queryRawUnsafe<any[]>(`
      SELECT c.id, c."firstName", c."lastName", c.email, c."aiSummary",
             1 - (c.embedding <=> j.embedding) AS match_score
      FROM "candidates" c, "job_openings" j
      WHERE j.id = $1
        AND c.embedding IS NOT NULL
        AND j.embedding IS NOT NULL
      ORDER BY c.embedding <=> j.embedding ASC
      LIMIT $2;
    `, jobId, limit);

    return candidates;
  }
}
