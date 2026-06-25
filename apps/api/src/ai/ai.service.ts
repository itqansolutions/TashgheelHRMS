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
   * Helper to check if the Gemini API Key is a mock or placeholder value.
   */
  private isMockKey(apiKey: string): boolean {
    return !apiKey || 
           apiKey === 'mock-key' || 
           apiKey === 'your_google_gemini_api_key' || 
           apiKey.startsWith('your_') || 
           apiKey.includes('placeholder') || 
           apiKey.includes('api_key');
  }

  /**
   * Mock generator for Job Descriptions.
   */
  private getMockJobDescription(dto: GenerateJdDto): string {
    return `# Job Description: ${dto.title}

## Job Summary
We are looking for a skilled and passionate **${dto.title}** to join our team in the **${dto.department || 'Operations'}** department. In this role, you will be responsible for executing key deliverables, collaborating with cross-functional stakeholders, and contributing to overall organizational success.

## Key Responsibilities
- Execute day-to-day operations and key deliverables aligned with the **${dto.title}** role.
- Collaborate with team members and cross-functional groups to achieve common objectives.
- Troubleshoot challenges, propose solutions, and optimize current workflows.
- Maintain clear documentation and adhere to standard operating procedures.
${dto.keywords ? `- Focus on requirements related to: ${dto.keywords}` : ''}

## Required Qualifications
- Bachelor's degree in a relevant field or equivalent practical experience.
- Strong organizational, analytical, and communication skills.
- Proven experience working in a collaborative team environment.

## Preferred Qualifications
- Prior experience in a similar industry or dynamic startup environment.
- Familiarity with modern collaboration tools and productivity suites.
- Adaptability to changing requirements and business priorities.`;
  }

  /**
   * Mock parser for Resume text extraction.
   */
  private getMockParsedResume(text: string) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/[\+]?[0-9\s\-()]{7,20}/);
    
    const cleanText = text.replace(/[\r\n\t]+/g, ' ').trim();
    const words = cleanText.split(/\s+/).filter(w => w.length > 2 && /^[a-zA-Z]+$/.test(w));
    const firstName = words[0] || 'John';
    const lastName = words[1] || 'Doe';

    const skillsList = ['Communication', 'Teamwork', 'Problem Solving'];
    const lowerText = text.toLowerCase();
    const commonSkills = [
      'javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 'postgres', 
      'sales', 'marketing', 'excel', 'finance', 'project management', 'agile', 'git', 
      'docker', 'aws', 'customer service', 'negotiation', 'leadership'
    ];
    commonSkills.forEach(skill => {
      if (lowerText.includes(skill)) {
        skillsList.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    });

    return {
      firstName,
      lastName,
      email: emailMatch ? emailMatch[0] : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: phoneMatch ? phoneMatch[0].trim() : '+1 (555) 019-2834',
      skills: [...new Set(skillsList)],
      aiSummary: `Extracted candidate profile for ${firstName} ${lastName}. Demonstrated background with skills in: ${skillsList.slice(0, 5).join(', ')}.`,
    };
  }

  /**
   * Generates a 768-dimensional embedding vector for a given text using Gemini.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
      if (this.isMockKey(apiKey)) {
        return Array.from({ length: 768 }, () => Math.random() - 0.5);
      }
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      this.logger.error('Failed to generate embedding, falling back to mock vector', error);
      return Array.from({ length: 768 }, () => Math.random() - 0.5);
    }
  }

  /**
   * Generates a comprehensive Job Description.
   */
  async generateJobDescription(dto: GenerateJdDto): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      this.logger.warn('Mock or missing GEMINI_API_KEY detected. Returning fallback JD.');
      return this.getMockJobDescription(dto);
    }
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
      this.logger.error('Failed to generate JD via Gemini, returning fallback JD', error);
      return this.getMockJobDescription(dto);
    }
  }

  /**
   * Parses a resume text into structured JSON data.
   */
  async parseResumeText(text: string) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      this.logger.warn('Mock or missing GEMINI_API_KEY detected. Returning fallback parsed resume.');
      return this.getMockParsedResume(text);
    }
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
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error('Failed to parse resume via Gemini, returning fallback parsed resume', error);
      return this.getMockParsedResume(text);
    }
  }

  /**
   * Sync Candidate Embedding to DB using raw SQL (pgvector).
   */
  async syncCandidateEmbedding(candidateId: string, textToEmbed: string) {
    const vector = await this.generateEmbedding(textToEmbed);
    if (vector.length === 0) return;

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
