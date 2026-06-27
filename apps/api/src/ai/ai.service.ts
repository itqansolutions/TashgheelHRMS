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
  async generateJobDescription(dto: GenerateJdDto): Promise<{
    descriptionEn: string;
    requirementsEn: string;
    descriptionAr: string;
    requirementsAr: string;
  }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      this.logger.warn('Mock or missing GEMINI_API_KEY detected. Returning fallback JD.');
      return {
        descriptionEn: this.getMockJobDescription(dto),
        requirementsEn: `- Strong experience as a ${dto.title}.\n- Degree in related field.\n- Excellent communication skills.`,
        descriptionAr: `نحن نبحث عن ${dto.title} موهوب للانضمام إلى فريقنا في قسم ${dto.department || 'العمليات'}.`,
        requirementsAr: `- خبرة قوية في مجال ${dto.title}.\n- شهادة جامعية في التخصص.\n- مهارات تواصل ممتازة.`
      };
    }
    try {
      const prompt = `
        You are an expert HR Recruiter. Generate a professional job specification in both English and Arabic for the following role:
        Title: ${dto.title}
        Department: ${dto.department || 'Not specified'}
        Additional Keywords/Requirements: ${dto.keywords || 'None'}

        You MUST respond with a clean, raw JSON object (with no markdown block quotes or backticks) containing exactly these keys:
        - "descriptionEn": A comprehensive, professional job summary and description in English (around 2-3 paragraphs).
        - "requirementsEn": A bulleted list of qualifications, technical skills, and experience requirements in English.
        - "descriptionAr": A comprehensive, professional job summary and description in Arabic (الوصف الوظيفي باللغة العربية) (around 2-3 paragraphs).
        - "requirementsAr": A bulleted list of qualifications, technical skills, and experience requirements in Arabic (الشروط والمؤهلات باللغة العربية).
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text || '{}';
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return {
        descriptionEn: parsed.descriptionEn || '',
        requirementsEn: parsed.requirementsEn || '',
        descriptionAr: parsed.descriptionAr || '',
        requirementsAr: parsed.requirementsAr || '',
      };
    } catch (error: any) {
      this.logger.error('Failed to generate JD via Gemini', error);
      throw new Error(`AI Provider Error: ${error?.message || error}`);
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
      this.logger.error('Failed to parse resume via Gemini', error);
      throw error;
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
      SELECT c.id, c."firstName", c."lastName", c.email, c."aiSummary", c.availability, c."expectedSalary",
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
      this.logger.error('Failed to generate interview questions via Gemini', error);
      throw error;
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

  /**
   * Generates a detailed matching explanation report comparing a candidate with a job opening.
   */
  async explainCandidateMatch(jobId: string, candidateId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      include: {
        experience: true,
        education: true,
        skills: true,
      },
    });

    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: jobId },
      include: {
        requisition: true,
      },
    });

    if (!candidate || !jobOpening) {
      throw new NotFoundException('Candidate or Job Opening not found');
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      this.logger.warn('Mock or missing GEMINI_API_KEY detected. Returning mock explanation.');
      return this.getMockCandidateMatchExplanation(candidate, jobOpening);
    }

    try {
      const prompt = `
        You are an expert recruitment AI. Compare the candidate profile and the job opening requirements.
        
        Candidate Details:
        - Name: ${candidate.firstName} ${candidate.lastName}
        - Email: ${candidate.email || ''}
        - Location: ${candidate.currentLocation || 'Not specified'}
        - Expected Salary: ${candidate.expectedSalary || 'Not specified'} SAR
        - Availability: ${candidate.availability || 'Not specified'}
        - Skills: ${candidate.skills.map(s => s.skillName).join(', ')}
        - Experience: ${candidate.experience.map(e => `${e.title} at ${e.companyName}: ${e.description || ''}`).join('; ')}
        - Education: ${candidate.education.map(ed => `${ed.degree} in ${ed.fieldOfStudy} from ${ed.institution}`).join('; ')}
        
        Job Opening Details:
        - Title: ${jobOpening.title}
        - Department: ${jobOpening.requisition.department}
        - Location: ${jobOpening.requisition.location}
        - Salary Range: ${jobOpening.requisition.salaryMin || ''} - ${jobOpening.requisition.salaryMax || ''} SAR
        - Job Type: ${jobOpening.requisition.type}
        - Requirements: ${jobOpening.requisition.requirementsEn}
        - Description: ${jobOpening.requisition.descriptionEn}

        Analyze and return a STRICT JSON object representing a detailed compatibility report. Do not include markdown formatting or backticks in the response. The JSON must exactly match this structure:
        {
          "overallScore": number (0-100),
          "rating": number (1-5 representing stars),
          "matchCategory": "Excellent Match" | "Strong Match" | "Good Match" | "Partial Match",
          "breakdown": {
            "skills": number (0-100),
            "experience": number (0-100),
            "education": number (0-100),
            "location": number (0-100),
            "salary": number (0-100),
            "industry": number (0-100),
            "languages": number (0-100)
          },
          "skillsMatch": [
            { "skill": "Skill Name", "required": "Required state/years", "candidate": "Candidate proficiency/years/Yes/No", "score": number (0-100) }
          ],
          "experienceMatch": { "required": "Years/titles needed", "candidate": "Years/titles candidate has", "score": number (0-100) },
          "educationMatch": { "required": "Degrees needed", "candidate": "Candidate degree", "score": number (0-100) },
          "industryMatch": { "required": "Domain needed", "candidate": "Candidate domains", "score": number (0-100) },
          "locationMatch": { "required": "Location needed", "candidate": "Candidate location", "score": number (0-100) },
          "salaryMatch": { "required": "Salary budget", "candidate": "Candidate expectation", "score": number (0-100) },
          "languageMatch": [
            { "language": "Language", "required": "Level", "candidate": "Level", "score": number (0-100) }
          ],
          "missingSkills": ["Skill 1", "Skill 2"],
          "strengths": ["Strength 1", "Strength 2"],
          "weaknesses": ["Weakness 1", "Weakness 2"],
          "missingSkillsAnalysis": {
            "criticalMissingSkills": ["Skill A"],
            "recommendedUpskilling": ["Upskilling tip"],
            "trainableSkills": ["Trainable A"],
            "dealBreakers": ["Deal breaker if any"]
          },
          "recommendationText": "Professional Gemini narrative paragraph explaining why the candidate is a fit, key highlights, risks, and onboarding focus."
        }
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text || '{}';
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error: any) {
      this.logger.error('Failed to generate candidate matching report via Gemini', error);
      throw new Error(`AI Matching Error: ${error.message || error}`);
    }
  }

  /**
   * Reverse matching to find job openings suited for a candidate based on vector embeddings.
   */
  async findMatchingJobsForCandidate(candidateId: string, limit = 10) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const jobs = await this.db.$queryRawUnsafe<any[]>(`
      SELECT j.id, j.title, j.status, r.location, r.department, r."salaryMin", r."salaryMax",
             1 - (j.embedding <=> c.embedding) AS match_score
      FROM "job_openings" j
      INNER JOIN "job_requisitions" r ON j."requisitionId" = r.id
      CROSS JOIN "candidates" c
      WHERE c.id = $1
        AND c.embedding IS NOT NULL
        AND j.embedding IS NOT NULL
      ORDER BY j.embedding <=> c.embedding ASC
      LIMIT $2;
    `, candidateId, limit);

    return jobs;
  }

  /**
   * Selects the top 5 candidates and generates a shortlist summary.
   */
  async generateAiShortlist(jobId: string) {
    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: jobId },
      include: { requisition: true },
    });

    if (!jobOpening) {
      throw new NotFoundException('Job Opening not found');
    }

    const topCandidates = await this.findMatchingCandidatesForJob(jobOpening.id, 10);

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      this.logger.warn('Mock or missing GEMINI_API_KEY. Returning mock shortlist.');
      return topCandidates.slice(0, 5).map((c: any, index: number) => ({
        candidateId: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        matchScore: Math.round((c.match_score || 0.85) * 100),
        rank: index + 1,
        shortlistReason: `Ranked #${index + 1} based on skills similarity and profile summary.`
      }));
    }

    try {
      const candidatesPayload = topCandidates.map((c: any) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        aiSummary: c.aiSummary || '',
        matchScore: Math.round((c.match_score || 0) * 100),
      }));

      const prompt = `
        You are an expert HR AI. You need to shortlist the best 5 candidates for the following job opening:
        
        Job Requisition:
        - Title: ${jobOpening.title}
        - Department: ${jobOpening.requisition.department}
        - Requirements: ${jobOpening.requisition.requirementsEn}
        - Description: ${jobOpening.requisition.descriptionEn}

        Top candidates retrieved from vector search:
        ${JSON.stringify(candidatesPayload)}

        Select the best 5 candidates from the list. Rank them from 1 to 5.
        Write a concise, 1-sentence selection reasoning for each.
        Return a STRICT JSON array of objects. Do not include markdown formatting or backticks.
        The JSON must match this structure:
        [
          {
            "candidateId": "UUID string",
            "firstName": "First name",
            "lastName": "Last name",
            "email": "Email",
            "matchScore": number (0-100),
            "rank": number (1-5),
            "shortlistReason": "One-sentence professional justification why this candidate was selected for the shortlist."
          }
        ]
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text || '[]';
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error: any) {
      this.logger.error('Failed to generate AI Shortlist via Gemini', error);
      throw new Error(`AI Shortlist Error: ${error.message || error}`);
    }
  }

  /**
   * Compares up to 3 candidates side-by-side for a specific job opening.
   */
  async compareCandidates(jobId: string, candidateIds: string[]) {
    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: jobId },
      include: { requisition: true },
    });

    if (!jobOpening) {
      throw new NotFoundException('Job Opening not found');
    }

    const candidates = await this.db.candidate.findMany({
      where: { id: { in: candidateIds } },
      include: {
        experience: true,
        education: true,
        skills: true,
      },
    });

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      return {
        comparison: candidates.map((c: any, index: number) => ({
          candidateId: c.id,
          name: `${c.firstName} ${c.lastName}`,
          overallScore: 85 - index * 5,
          strengths: ['Good foundational tech stack', 'Clear communication'],
          weaknesses: ['Missing secondary integrations'],
          recommendation: 'Recommended for standard onboarding path.'
        })),
        highlightedCandidateId: candidates[0]?.id || null,
        bestCandidateReason: 'Candidate displays the highest matching score and alignment with core skills.'
      };
    }

    try {
      const candidatesData = candidates.map((c: any) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email || '',
        currentLocation: c.currentLocation || '',
        expectedSalary: c.expectedSalary || '',
        skills: c.skills.map((s: any) => s.skillName),
        experience: c.experience.map((e: any) => `${e.title} at ${e.companyName}: ${e.description || ''}`),
        education: c.education.map((ed: any) => `${ed.degree} from ${ed.institution}`),
      }));

      const prompt = `
        You are an expert HR AI. Compare these candidates side-by-side for the job opening:
        
        Job Requisition:
        - Title: ${jobOpening.title}
        - Requirements: ${jobOpening.requisition.requirementsEn}
        
        Candidates to compare:
        ${JSON.stringify(candidatesData)}

        Generate a comparison report. Identify the best candidate and explain why.
        Return a STRICT JSON object. Do not include markdown formatting or backticks.
        The JSON must match this structure:
        {
          "comparison": [
            {
              "candidateId": "UUID string",
              "name": "Candidate Name",
              "overallScore": number (0-100),
              "strengths": ["string"],
              "weaknesses": ["string"],
              "recommendation": "Brief recommendation narrative"
            }
          ],
          "highlightedCandidateId": "UUID of the best candidate",
          "bestCandidateReason": "Explain why this candidate is the best choice among the compared ones."
        }
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text || '{}';
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error: any) {
      this.logger.error('Failed to compare candidates via Gemini', error);
      throw new Error(`AI Comparison Error: ${error.message || error}`);
    }
  }

  /**
   * Generates a final hiring recommendation with confidence scores.
   */
  async generateHiringRecommendation(jobId: string, candidateId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      include: { experience: true, education: true, skills: true },
    });

    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: jobId },
      include: { requisition: true },
    });

    if (!candidate || !jobOpening) {
      throw new NotFoundException('Candidate or Job Opening not found');
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      return {
        confidence: 'High',
        reasons: ['Exceeds required years of experience', 'Possesses critical tech stack'],
        risks: ['Salary is close to upper bound of budget'],
        nextStep: 'Offer extension or final interview with team lead',
        suggestedPanel: ['Engineering Manager', 'Senior Developer']
      };
    }

    try {
      const prompt = `
        You are an expert HR AI Advisor. Generate a formal hiring recommendation for:
        Candidate: ${candidate.firstName} ${candidate.lastName}
        Job Opening: ${jobOpening.title}
        
        Requirements: ${jobOpening.requisition.requirementsEn}
        Candidate Summary: ${candidate.aiSummary || ''}
        Candidate Skills: ${candidate.skills.map((s: any) => s.skillName).join(', ')}

        Return a STRICT JSON object. Do not include markdown formatting or backticks.
        The JSON must match this structure:
        {
          "confidence": "High" | "Medium" | "Low",
          "reasons": ["Reason 1", "Reason 2"],
          "risks": ["Risk 1", "Risk 2"],
          "nextStep": "Recommended next step (e.g. Extend Offer, Technical Stage)",
          "suggestedPanel": ["Role 1", "Role 2"]
        }
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text || '{}';
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error: any) {
      this.logger.error('Failed to generate hiring recommendation via Gemini', error);
      throw new Error(`AI Recommendation Error: ${error.message || error}`);
    }
  }

  private getMockCandidateMatchExplanation(candidate: any, jobOpening: any) {
    const overallScore = 88;
    return {
      overallScore,
      rating: 4,
      matchCategory: 'Strong Match',
      breakdown: {
        skills: 85,
        experience: 90,
        education: 80,
        location: 100,
        salary: 100,
        industry: 80,
        languages: 100
      },
      skillsMatch: [
        { skill: 'TypeScript', required: 'Required', candidate: 'Experienced', score: 90 },
        { skill: 'NestJS', required: 'Required', candidate: 'Intermediate', score: 80 }
      ],
      experienceMatch: { required: '3+ Years', candidate: '4 Years', score: 90 },
      educationMatch: { required: 'Computer Science or equivalent', candidate: 'Bachelor Degree', score: 85 },
      industryMatch: { required: 'Tech / HRMS', candidate: 'Software Development', score: 80 },
      locationMatch: { required: jobOpening.requisition.location, candidate: candidate.currentLocation || 'Same Location', score: 100 },
      salaryMatch: { required: 'Within Budget', candidate: candidate.expectedSalary ? `${candidate.expectedSalary} SAR` : 'Not specified', score: 100 },
      languageMatch: [
        { language: 'English', required: 'Professional', candidate: 'Excellent', score: 100 }
      ],
      missingSkills: ['Kubernetes'],
      strengths: ['Strong TypeScript knowledge', 'Good team player'],
      weaknesses: ['No container orchestration experience'],
      missingSkillsAnalysis: {
        criticalMissingSkills: [],
        recommendedUpskilling: ['Learn Docker & Kubernetes'],
        trainableSkills: ['Container deployment'],
        dealBreakers: []
      },
      recommendationText: `Ahmed is a strong candidate for the ${jobOpening.title} role. They possess 4 years of experience and fit the salary range perfectly. Gaps in Kubernetes are minor and can be trained.`
    };
  }

  /**
   * Conversational assistant for recruitment tasks on a job opening.
   */
  async askRecruiterAssistant(jobId: string, message: string): Promise<string> {
    const jobOpening = await this.db.jobOpening.findUnique({
      where: { id: jobId },
      include: { requisition: true },
    });

    if (!jobOpening) {
      throw new NotFoundException('Job Opening not found');
    }

    const topCandidates = await this.findMatchingCandidatesForJob(jobOpening.id, 10);

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || 'mock-key';
    if (this.isMockKey(apiKey)) {
      return `[Mock Recruiter Assistant]: Comparing candidates for "${jobOpening.title}". You asked: "${message}". I found ${topCandidates.length} matching candidates. Ahmed is a strong fit.`;
    }

    try {
      const candidatesSummary = topCandidates.map((c: any) => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        skills: c.skills?.map((s: any) => s.skillName) || [],
        aiSummary: c.aiSummary || '',
        matchScore: Math.round((c.match_score || 0) * 100),
      }));

      const prompt = `
        You are Tashgheel Recruiter Assistant, an AI HR Assistant. You are here to answer the recruiter's questions about candidate matches for the position: "${jobOpening.title}".
        
        Job Requisition Context:
        - Title: ${jobOpening.title}
        - Department: ${jobOpening.requisition.department}
        - Location: ${jobOpening.requisition.location}
        - Requirements: ${jobOpening.requisition.requirementsEn}
        - Description: ${jobOpening.requisition.descriptionEn}

        List of top matching candidates from database:
        ${JSON.stringify(candidatesSummary)}

        Recruiter Question:
        "${message}"

        Provide a professional, concise, and helpful response. Answer directly based on the candidate details provided above. If asked to compare or list, do so clearly. Don't use markdown code blocks or formatting.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || '';
    } catch (error: any) {
      this.logger.error('Failed to run Recruiter Assistant via Gemini', error);
      throw new Error(`AI Assistant Error: ${error.message || error}`);
    }
  }
}
