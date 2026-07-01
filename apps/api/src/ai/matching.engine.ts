/**
 * Hybrid Multi-Dimensional Candidate-Job Matching Engine
 *
 * Combines semantic vector search (pre-filter) with deterministic weighted
 * scoring across 7 dimensions to produce transparent, explainable match
 * scores suitable for a real recruitment business.
 *
 * Dimension Weights:
 *   Skills Match:        35%
 *   Experience Years:    25%
 *   Seniority Level:     15%
 *   Salary Fit:          10%
 *   Location Match:       5%
 *   Education:            5%
 *   Languages:            5%
 */

export interface CandidateMatchProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  aiSummary?: string | null;
  seniorityLevel?: string | null;
  totalYearsExperience?: number | null;
  industryBackground?: string | null;
  expectedSalary?: number | null;
  currentLocation?: string | null;
  skills: Array<{ skillName: string; proficiency?: string }>;
  experience: Array<{
    title: string;
    companyName: string;
    description?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    isCurrent?: boolean;
  }>;
  education: Array<{
    degree: string;
    fieldOfStudy?: string | null;
    institution: string;
  }>;
  certifications?: Array<{ name: string }> | null;
  languages?: Array<{ language: string; proficiency: string }> | null;
  /** Raw cosine similarity score from pgvector (0–1) */
  vectorScore?: number;
}

export interface JobMatchProfile {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  type?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  seniorityLevel?: string | null;
  minExperienceYears?: number | null;
  descriptionEn?: string | null;
  requirementsEn?: string | null;
  requiredSkills?: Array<{
    skill: string;
    required: boolean;
    minLevel?: string;
    minYears?: number;
  }> | null;
  requiredLanguages?: Array<{ language: string; level: string }> | null;
}

export interface DimensionScore {
  score: number;    // 0–100
  weight: number;   // 0.0–1.0
  weighted: number; // score * weight (contribution to overall)
  details: string;  // human-readable explanation shown in UI
}

export interface HybridMatchResult {
  overallScore: number; // 0–100 weighted composite
  dimensions: {
    skills: DimensionScore;
    experienceYears: DimensionScore;
    seniority: DimensionScore;
    salary: DimensionScore;
    location: DimensionScore;
    education: DimensionScore;
    languages: DimensionScore;
  };
  vectorScore: number;    // raw pgvector cosine similarity (0–1)
  dealBreakers: string[]; // critical mismatches that should flag the match
  matchCategory:
    | 'Excellent Match'
    | 'Strong Match'
    | 'Good Match'
    | 'Partial Match'
    | 'Poor Match';
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const SENIORITY_LEVELS = ['Junior', 'Mid', 'Senior', 'Lead', 'Executive'];

function getSeniorityIndex(level: string | null | undefined): number {
  if (!level) return -1;
  return SENIORITY_LEVELS.findIndex(
    (l) => l.toLowerCase() === level.toLowerCase(),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 1: Skills  (weight = 0.35)
// ─────────────────────────────────────────────────────────────────────────────

function computeSkillsScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): DimensionScore {
  const weight = 0.35;

  const candidateSkillNames = candidate.skills.map((s) =>
    s.skillName.toLowerCase(),
  );

  // If no structured required skills — use keyword search against free text
  if (!job.requiredSkills || job.requiredSkills.length === 0) {
    const jobText = `${job.requirementsEn || ''} ${job.descriptionEn || ''}`.toLowerCase();
    if (!jobText.trim()) {
      return {
        score: 70,
        weight,
        weighted: 70 * weight,
        details: 'No required skills specified — defaulting to 70%',
      };
    }

    const matched = candidateSkillNames.filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`).test(jobText);
    });

    const score = Math.round(
      Math.min((matched.length / Math.max(candidateSkillNames.length, 1)) * 100 * 1.2, 100),
    );
    return {
      score,
      weight,
      weighted: score * weight,
      details: `${matched.length} of ${candidateSkillNames.length} candidate skills found in job text`,
    };
  }

  const requiredSkills = job.requiredSkills.filter((s) => s.required);
  const niceSkills = job.requiredSkills.filter((s) => !s.required);

  const matchRequired = (reqSkill: string) =>
    candidateSkillNames.some(
      (cs) =>
        cs.includes(reqSkill.toLowerCase()) ||
        reqSkill.toLowerCase().includes(cs),
    );

  // Required skills → 80% of this dimension's score
  let requiredScore = 100;
  let matchedRequiredCount = 0;
  if (requiredSkills.length > 0) {
    matchedRequiredCount = requiredSkills.filter((s) => matchRequired(s.skill)).length;
    requiredScore = Math.round((matchedRequiredCount / requiredSkills.length) * 100);
  }

  // Nice-to-have → 20% of this dimension's score
  let niceScore = 100;
  if (niceSkills.length > 0) {
    const matchedNice = niceSkills.filter((s) => matchRequired(s.skill)).length;
    niceScore = Math.round((matchedNice / niceSkills.length) * 100);
  }

  const score = Math.round(requiredScore * 0.8 + niceScore * 0.2);
  return {
    score,
    weight,
    weighted: score * weight,
    details: `${matchedRequiredCount}/${requiredSkills.length} required skills matched`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 2: Experience Years  (weight = 0.25)
// ─────────────────────────────────────────────────────────────────────────────

function computeExperienceScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): DimensionScore {
  const weight = 0.25;
  const candidateYears = candidate.totalYearsExperience ?? 0;

  if (!job.minExperienceYears) {
    const score = candidateYears >= 5 ? 90 : candidateYears >= 2 ? 80 : 60;
    return {
      score,
      weight,
      weighted: score * weight,
      details: `No minimum years specified. Candidate has ${candidateYears} yrs.`,
    };
  }

  const required = job.minExperienceYears;
  if (candidateYears === 0) {
    return {
      score: 20,
      weight,
      weighted: 20 * weight,
      details: `0 years experience, ${required} required`,
    };
  }

  // Ratio capped at 1.0 (being overqualified doesn't penalize)
  const ratio = Math.min(candidateYears / required, 1.0);
  const score = Math.round(ratio * 100);

  const detail =
    candidateYears >= required
      ? `✅ ${candidateYears} yrs (${required} required)`
      : `⚠️ ${candidateYears} yrs (${required} required — ${required - candidateYears} short)`;

  return { score, weight, weighted: score * weight, details: detail };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 3: Seniority  (weight = 0.15)
// ─────────────────────────────────────────────────────────────────────────────

function computeSeniorityScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): DimensionScore {
  const weight = 0.15;

  if (!job.seniorityLevel) {
    return {
      score: 75,
      weight,
      weighted: 75 * weight,
      details: 'No seniority requirement specified',
    };
  }
  if (!candidate.seniorityLevel) {
    return {
      score: 60,
      weight,
      weighted: 60 * weight,
      details: 'Candidate seniority level not determined',
    };
  }

  const jobIdx = getSeniorityIndex(job.seniorityLevel);
  const candIdx = getSeniorityIndex(candidate.seniorityLevel);

  if (jobIdx === -1 || candIdx === -1) {
    return {
      score: 60,
      weight,
      weighted: 60 * weight,
      details: 'Unknown seniority level',
    };
  }

  const diff = Math.abs(jobIdx - candIdx);
  let score: number;
  let detail: string;

  if (diff === 0) {
    score = 100;
    detail = `✅ Exact match: ${candidate.seniorityLevel}`;
  } else if (diff === 1) {
    score = candIdx > jobIdx ? 85 : 70; // Overqualified vs Underqualified
    detail =
      candIdx > jobIdx
        ? `⚡ Overqualified: ${candidate.seniorityLevel} for ${job.seniorityLevel} role`
        : `⚠️ Slightly underqualified: ${candidate.seniorityLevel} for ${job.seniorityLevel} role`;
  } else if (diff === 2) {
    score = candIdx > jobIdx ? 55 : 30;
    detail =
      candIdx > jobIdx
        ? `Significantly overqualified: ${candidate.seniorityLevel} for ${job.seniorityLevel} role`
        : `❌ Underqualified: ${candidate.seniorityLevel} for ${job.seniorityLevel} role`;
  } else {
    score = 10;
    detail = `❌ Major seniority mismatch: ${candidate.seniorityLevel} vs ${job.seniorityLevel} required`;
  }

  return { score, weight, weighted: score * weight, details: detail };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 4: Salary  (weight = 0.10)
// ─────────────────────────────────────────────────────────────────────────────

function computeSalaryScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): DimensionScore {
  const weight = 0.1;

  if (!candidate.expectedSalary) {
    return {
      score: 80,
      weight,
      weighted: 80 * weight,
      details: 'Candidate salary expectation not specified',
    };
  }
  if (!job.salaryMax) {
    return {
      score: 80,
      weight,
      weighted: 80 * weight,
      details: 'Job salary budget not specified',
    };
  }

  const expected = Number(candidate.expectedSalary);
  const budgetMax = Number(job.salaryMax);
  const budgetMin = job.salaryMin ? Number(job.salaryMin) : budgetMax * 0.7;

  if (expected <= budgetMax) {
    const score = expected >= budgetMin ? 100 : 90;
    const label = expected >= budgetMin
      ? `✅ Within range (${budgetMin.toLocaleString()}–${budgetMax.toLocaleString()} SAR)`
      : `✅ Below minimum (${expected.toLocaleString()} SAR)`;
    return { score, weight, weighted: score * weight, details: label };
  }

  // Above budget
  const overage = ((expected - budgetMax) / budgetMax) * 100;
  let score: number;
  if (overage <= 10) {
    score = 60;
  } else if (overage <= 25) {
    score = 35;
  } else {
    score = 10;
  }
  return {
    score,
    weight,
    weighted: score * weight,
    details: `⚠️ Over budget by ${overage.toFixed(0)}% (${expected.toLocaleString()} vs ${budgetMax.toLocaleString()} SAR max)`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 5: Location  (weight = 0.05)
// ─────────────────────────────────────────────────────────────────────────────

function computeLocationScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): DimensionScore {
  const weight = 0.05;

  if (!candidate.currentLocation || !job.location) {
    return {
      score: 70,
      weight,
      weighted: 70 * weight,
      details: 'Location data incomplete',
    };
  }

  const candLoc = candidate.currentLocation.toLowerCase();
  const jobLoc = job.location.toLowerCase();

  if (jobLoc.includes('remote') || jobLoc.includes('anywhere')) {
    return {
      score: 100,
      weight,
      weighted: 100 * weight,
      details: '✅ Remote position — location not restrictive',
    };
  }

  const candParts = candLoc.split(/[,/\-]/).map((p) => p.trim());
  const jobParts = jobLoc.split(/[,/\-]/).map((p) => p.trim());

  const cityMatch = candParts.some((cp) =>
    jobParts.some((jp) => jp.includes(cp) || cp.includes(jp)),
  );
  if (cityMatch) {
    return {
      score: 100,
      weight,
      weighted: 100 * weight,
      details: `✅ Same location: ${candidate.currentLocation}`,
    };
  }

  // Country check (last token)
  const candCountry = candParts[candParts.length - 1];
  const jobCountry = jobParts[jobParts.length - 1];
  if (
    candCountry &&
    jobCountry &&
    (candCountry.includes(jobCountry) || jobCountry.includes(candCountry))
  ) {
    return {
      score: 75,
      weight,
      weighted: 75 * weight,
      details: '⚠️ Same country, different city (relocation may be needed)',
    };
  }

  return {
    score: 40,
    weight,
    weighted: 40 * weight,
    details: '⚠️ Different country — relocation or visa required',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 6: Education  (weight = 0.05)
// ─────────────────────────────────────────────────────────────────────────────

function computeEducationScore(
  candidate: CandidateMatchProfile,
  _job: JobMatchProfile,
): DimensionScore {
  const weight = 0.05;

  if (candidate.education.length === 0) {
    return {
      score: 40,
      weight,
      weighted: 40 * weight,
      details: 'No education records on file',
    };
  }

  const degreeRank: Record<string, number> = {
    phd: 100,
    doctorate: 100,
    master: 90,
    mba: 90,
    msc: 90,
    'b.sc': 75,
    'b.eng': 75,
    bachelor: 75,
    bsc: 75,
    diploma: 60,
    associate: 55,
    certificate: 50,
  };

  let bestScore = 50;
  let bestLabel = '';

  for (const edu of candidate.education) {
    const lower = edu.degree.toLowerCase();
    for (const [key, rank] of Object.entries(degreeRank)) {
      if (lower.includes(key) && rank > bestScore) {
        bestScore = rank;
        bestLabel = `${edu.degree} — ${edu.institution}`;
      }
    }
  }

  return {
    score: bestScore,
    weight,
    weighted: bestScore * weight,
    details: bestLabel || `${candidate.education[0]?.degree} — ${candidate.education[0]?.institution}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 7: Languages  (weight = 0.05)
// ─────────────────────────────────────────────────────────────────────────────

function computeLanguagesScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): DimensionScore {
  const weight = 0.05;

  const requiredLangs = (job.requiredLanguages as Array<{
    language: string;
    level: string;
  }> | null) ?? [];

  if (requiredLangs.length === 0) {
    return {
      score: 85,
      weight,
      weighted: 85 * weight,
      details: 'No language requirements specified',
    };
  }

  const candidateLangs = (candidate.languages as Array<{
    language: string;
    proficiency: string;
  }> | null) ?? [];

  if (candidateLangs.length === 0) {
    return {
      score: 50,
      weight,
      weighted: 50 * weight,
      details: 'Candidate language data not available',
    };
  }

  const profRank: Record<string, number> = {
    native: 5,
    fluent: 4,
    professional: 3,
    conversational: 2,
    basic: 1,
  };

  let total = 0;
  for (const req of requiredLangs) {
    const reqLang = req.language.toLowerCase();
    const reqRank = profRank[req.level?.toLowerCase()] ?? 3;

    const found = candidateLangs.find(
      (l) =>
        l.language.toLowerCase().includes(reqLang) ||
        reqLang.includes(l.language.toLowerCase()),
    );

    if (!found) {
      total += 0;
    } else {
      const candRank = profRank[found.proficiency?.toLowerCase()] ?? 2;
      total += candRank >= reqRank ? 100 : (candRank / reqRank) * 70;
    }
  }

  const score = Math.round(total / requiredLangs.length);
  return {
    score,
    weight,
    weighted: score * weight,
    details: `${requiredLangs.length} language(s) required`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: compute the full hybrid score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a hybrid weighted match score for a candidate against a job.
 * Pure function — no I/O, no LLM calls, deterministic.
 */
export function computeHybridScore(
  candidate: CandidateMatchProfile,
  job: JobMatchProfile,
): HybridMatchResult {
  const skills = computeSkillsScore(candidate, job);
  const experienceYears = computeExperienceScore(candidate, job);
  const seniority = computeSeniorityScore(candidate, job);
  const salary = computeSalaryScore(candidate, job);
  const location = computeLocationScore(candidate, job);
  const education = computeEducationScore(candidate, job);
  const languages = computeLanguagesScore(candidate, job);

  const overallScore = Math.round(
    skills.weighted +
      experienceYears.weighted +
      seniority.weighted +
      salary.weighted +
      location.weighted +
      education.weighted +
      languages.weighted,
  );

  // Detect deal-breakers (critical flags shown in the UI)
  const dealBreakers: string[] = [];
  if (salary.score < 30 && candidate.expectedSalary && job.salaryMax) {
    dealBreakers.push(
      `Salary expectation (${Number(candidate.expectedSalary).toLocaleString()} SAR) exceeds budget by >25%`,
    );
  }
  if (seniority.score < 30) {
    dealBreakers.push(
      `Seniority mismatch: ${candidate.seniorityLevel ?? 'Unknown'} vs ${job.seniorityLevel} required`,
    );
  }
  const reqSkillsArr = (job.requiredSkills as Array<{ required: boolean }> | null) ?? [];
  if (skills.score < 30 && reqSkillsArr.filter((s) => s.required).length > 0) {
    dealBreakers.push('Fewer than 30% of required skills are present');
  }

  // Match category
  let matchCategory: HybridMatchResult['matchCategory'];
  if (overallScore >= 85) matchCategory = 'Excellent Match';
  else if (overallScore >= 72) matchCategory = 'Strong Match';
  else if (overallScore >= 58) matchCategory = 'Good Match';
  else if (overallScore >= 40) matchCategory = 'Partial Match';
  else matchCategory = 'Poor Match';

  return {
    overallScore,
    dimensions: {
      skills,
      experienceYears,
      seniority,
      salary,
      location,
      education,
      languages,
    },
    vectorScore: candidate.vectorScore ?? 0,
    dealBreakers,
    matchCategory,
  };
}
