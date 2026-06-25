import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../database/database.service';
import { GenerateJdDto, GenerateQuestionsDto } from './dto/ai.dto';
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
    const blacklist = ['pdf', 'obj', 'stream', 'endobj', 'xref', 'trailer', 'startxref', 'eof'];
    const words = cleanText.split(/\s+/)
      .filter(w => w.length > 2 && /^[a-zA-Z]+$/.test(w))
      .filter(w => !blacklist.includes(w.toLowerCase()));
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

    const experience = [
      {
        companyName: 'Tashgheel Solutions',
        title: 'Software Engineer',
        startDate: '2023-01-01',
        endDate: null,
        isCurrent: true,
        description: 'Developing HRMS modules and AI features.',
      }
    ];

    const education = [
      {
        institution: 'King Saud University',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2018-09-01',
        endDate: '2022-06-30',
      }
    ];

    return {
      firstName,
      lastName,
      email: emailMatch ? emailMatch[0] : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: phoneMatch ? phoneMatch[0].trim() : '+1 (555) 019-2834',
      skills: [...new Set(skillsList)],
      aiSummary: `Extracted candidate profile for ${firstName} ${lastName}. Demonstrated background with skills in: ${skillsList.slice(0, 5).join(', ')}.`,
      experience,
      education,
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
        - experience (array of objects: each object must have "companyName" (string), "title" (string), "startDate" (string in YYYY-MM-DD format), "endDate" (string or null), "isCurrent" (boolean), "description" (string or null))
        - education (array of objects: each object must have "institution" (string), "degree" (string), "fieldOfStudy" (string or null), "startDate" (string in YYYY-MM-DD format), "endDate" (string or null))

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

  /**
   * Generates tailored interview questions based on Candidate and Job Opening profiles.
   */
  async generateInterviewQuestions(dto: GenerateQuestionsDto): Promise<string> {
    const candidate = await this.db.candidate.findUnique({
      where: { id: dto.candidateId },
      include: {
        skills: true,
        experience: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: dto.jobOpeningId },
      include: {
        requisition: true,
      },
    });

    if (!jobOpening) {
      throw new NotFoundException('Job Opening not found');
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      this.logger.warn('Mock or missing GEMINI_API_KEY detected. Returning mock questions.');
      return this.getMockInterviewQuestions(candidate, jobOpening);
    }

    try {
      const skillsText = candidate.skills.map((s) => s.skillName).join(', ');
      const expText = candidate.experience.map((e) => `${e.title} at ${e.companyName}`).join(', ');
      const jobTitle = jobOpening.title;
      const jobDesc = jobOpening.requisition.descriptionEn;
      const jobReqs = jobOpening.requisition.requirementsEn;

      const prompt = `
        You are an expert HR Recruitment Specialist and Technical Interviewer.
        Generate a list of 5 tailored interview questions for candidate ${candidate.firstName} ${candidate.lastName} who is applying for the position of "${jobTitle}".
        
        Candidate Context:
        - Skills: ${skillsText || 'Not specified'}
        - Experience: ${expText || 'Not specified'}
        - AI Summary: ${candidate.aiSummary || 'Not specified'}
        
        Job Requirements Context:
        - Description: ${jobDesc}
        - Key Requirements: ${jobReqs}

        Write the questions in professional English, and also provide a brief, helpful tip or expected answer guideline for each question.
        Format the response in clean Markdown with clear headings or numbered lists.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || '';
    } catch (error) {
      this.logger.error('Failed to generate interview questions via Gemini, returning mock questions', error);
      return this.getMockInterviewQuestions(candidate, jobOpening);
    }
  }

  private getMockInterviewQuestions(candidate: any, jobOpening: any): string {
    const jobTitle = jobOpening.title;
    const skillsText = candidate.skills.map((s: any) => s.skillName).join(', ') || 'general skills';
    return `# Suggested Interview Questions for ${candidate.firstName} ${candidate.lastName}
## Position: ${jobTitle}

Here is a list of customized interview questions based on the candidate's skills (${skillsText}) and the requirements for the ${jobTitle} role:

1. **How do you leverage your experience in similar environments to hit the ground running as a ${jobTitle}?**
   * *Evaluation Guideline*: Look for specific project details, their workflow methodologies, and how they handle fast transition times.

2. **Based on your background, could you explain a challenging project you worked on that required skills in ${skillsText.split(',')[0] || 'problem solving'}?**
   * *Evaluation Guideline*: The candidate should describe the problem clearly, detail their action steps, and explain the positive outcome (STAR method).

3. **Our team relies on close collaboration and standard procedures. How do you handle cases where requirements change rapidly during a sprint or project phase?**
   * *Evaluation Guideline*: Evaluate their flexibility, communications style under pressure, and adaptability.

4. **Which tools or best practices do you consider essential for success as a ${jobTitle}, and how have you applied them in past roles?**
   * *Evaluation Guideline*: Listen for modern technical vocabulary, adherence to standard industry guidelines, and practical examples.

5. **Why are you interested in this role at our company, and how does it align with your long-term career aspirations?**
   * *Evaluation Guideline*: Look for genuine interest in the company's product/mission and a desire to grow within the team.`;
  }
}
