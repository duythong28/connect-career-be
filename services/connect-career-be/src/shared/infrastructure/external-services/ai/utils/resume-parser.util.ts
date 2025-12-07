export interface PersonalInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  address?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  portfolio?: string;
  summary?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  responsibilities?: string[];
  achievements?: string[];
  technologies?: string[];
  skills?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: number;
  honors?: string[];
  description?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  role?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  technologies: string[];
  url?: string;
  github?: string;
  highlights: string[];
}

export interface Skills {
  technical: string[];
  soft: string[];
  languages: Array<{
    language: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
  }>;
}

export interface ParsedResume {
  personalInfo: PersonalInfo;
  summary?: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
  projects: Project[];
  awards: string[];
  languages: string[];
  rawSections: Record<string, string>;
}

export interface CVContent {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    avatar?: string;
  };
  summary?: string;
  workExperience: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    technologies?: string[];
    achievements?: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
    gpa?: number;
    honors?: string[];
  }>;
  skills?: {
    technical: string[];
    soft: string[];
    languages: Array<{
      language: string;
      proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
    }>;
  };
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    technologies: string[];
    url?: string;
    github?: string;
  }>;
}

interface DateComponents {
  year: number;
  month?: number;
  day?: number;
}

function parseDate(dateStr: string | undefined | null): DateComponents | null {
  if (!dateStr || dateStr.toLowerCase() === 'present') return null;

  const normalized = dateStr.trim().toLowerCase();

  // Month name + year: "January 2023" or "Jan 2023"
  const monthNamePattern =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s-]+(\d{4})\b/i;
  const monthMatch = normalized.match(monthNamePattern);
  if (monthMatch) {
    const monthMap: Record<string, number> = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };
    return {
      year: parseInt(monthMatch[2], 10),
      month: monthMap[monthMatch[1].substring(0, 3)],
      day: 1,
    };
  }

  // MM/YYYY or MM-YYYY
  const slashPattern = /\b(\d{1,2})[\/\-](\d{4})\b/;
  const slashMatch = normalized.match(slashPattern);
  if (slashMatch) {
    return {
      year: parseInt(slashMatch[2], 10),
      month: parseInt(slashMatch[1], 10),
      day: 1,
    };
  }
  const yearPattern = /\b(19|20)\d{2}\b/;
  const yearMatch = normalized.match(yearPattern);
  if (yearMatch) {
    return {
      year: parseInt(yearMatch[0], 10),
      month: 1,
      day: 1,
    };
  }

  return null;
}

function toISODate(date: DateComponents | null): string {
  if (!date) return '';
  const year = date.year;
  const month = (date.month || 1).toString().padStart(2, '0');
  const day = (date.day || 1).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateRange(text: string): {
  startDate: string;
  endDate?: string;
  current: boolean;
} {
  const rangeSeparators = /\s*[-–—to]\s*/i;
  const parts = text.split(rangeSeparators);

  if (parts.length >= 2) {
    const startDate = toISODate(parseDate(parts[0]));
    const isCurrent = /present|current|now/i.test(parts[1]);
    const endDate = isCurrent ? undefined : toISODate(parseDate(parts[1]));

    return { startDate, endDate, current: isCurrent };
  }

  // Single date (assume it's start date and current)
  const startDate = toISODate(parseDate(parts[0]));
  return { startDate, current: true };
}

function normalizeLine(line: string): string {
  return line
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\u2022/g, '•') // Bullet points
    .replace(/\u2013/g, '-') // En dash
    .replace(/\u2014/g, '—') // Em dash
    .replace(/\s+/g, ' ') // Multiple spaces
    .trim();
}

function cleanText(text: string): string {
  return text
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.length > 0)
    .join('\n');
}

const SECTION_PATTERNS = {
  EDUCATION: /^(education|academic|qualifications?)/i,
  EXPERIENCE:
    /^(experience|work\s*experience|employment|work\s*history|professional\s*experience)/i,
  SKILLS: /^(skills?|technical\s*skills?|core\s*competencies|expertise)/i,
  PROJECTS: /^(projects?|portfolio|work\s*samples?)/i,
  CERTIFICATIONS: /^(certifications?|licenses?|credentials?)/i,
  AWARDS: /^(awards?|achievements?|honors?|recognitions?)/i,
  LANGUAGES: /^(languages?)/i,
  SUMMARY: /^(summary|profile|objective|about|professional\s*summary)/i,
};

function detectSectionType(line: string): string | null {
  const upperLine = line.toUpperCase().trim();

  for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(upperLine)) {
      return section;
    }
  }

  return null;
}

function splitIntoSections(text: string): Record<string, string> {
  const lines = text.split('\n').map(normalizeLine).filter(Boolean);
  const sections: Record<string, string> = { HEADER: '' };
  let currentSection = 'HEADER';

  for (const line of lines) {
    const sectionType = detectSectionType(line);

    if (sectionType) {
      currentSection = sectionType;
      sections[currentSection] = '';
    } else {
      if (!sections[currentSection]) {
        sections[currentSection] = '';
      }
      sections[currentSection] += line + '\n';
    }
  }

  // Clean up sections
  for (const key in sections) {
    sections[key] = sections[key].trim();
  }

  return sections;
}

function extractPersonalInfo(headerText: string): PersonalInfo {
  const lines = headerText.split('\n').map(normalizeLine);

  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const email = headerText.match(emailPattern)?.[0];

  const phonePattern =
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phone = headerText.match(phonePattern)?.[0];

  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = headerText.match(urlPattern) || [];

  const linkedin = urls.find((url) => url.includes('linkedin.com'));
  const github = urls.find((url) => url.includes('github.com'));
  const portfolio = urls.find(
    (url) => !url.includes('linkedin.com') && !url.includes('github.com'),
  );

  const nameCandidate = lines.find(
    (line) =>
      line.length > 3 &&
      line.length < 50 &&
      !emailPattern.test(line) &&
      !phonePattern.test(line) &&
      !urlPattern.test(line),
  );

  const locationPattern =
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2}|[A-Z][a-z]+)\b/;
  const locationMatch = headerText.match(locationPattern);
  const location = locationMatch?.[0];

  return {
    name: nameCandidate || 'Unknown',
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
  };
}

function extractBulletPoints(text: string): string[] {
  const bulletPattern = /^[\s]*[•\-\*]\s*(.+)$/gm;
  const bullets: string[] = [];
  let match;

  while ((match = bulletPattern.exec(text)) !== null) {
    bullets.push(match[1].trim());
  }

  return bullets;
}

function categorizeBulletPoints(bullets: string[]): {
  responsibilities: string[];
  achievements: string[];
} {
  const achievements: string[] = [];
  const responsibilities: string[] = [];

  const achievementPatterns = [
    /\b(increased|decreased|reduced|improved|optimized|enhanced|grew|generated|saved|achieved)\b/i,
    /\b\d+%/, // Contains percentage
    /\b(led|managed|launched|implemented|delivered|built|created|designed)\b/i,
  ];

  for (const bullet of bullets) {
    const isAchievement = achievementPatterns.some((pattern) =>
      pattern.test(bullet),
    );
    if (isAchievement) {
      achievements.push(bullet);
    } else {
      responsibilities.push(bullet);
    }
  }

  return { responsibilities, achievements };
}

function extractTechnologies(text: string): string[] {
  const techKeywords = [
    'JavaScript',
    'TypeScript',
    'React',
    'Vue',
    'Angular',
    'Node.js',
    'Python',
    'Java',
    'C#',
    'PHP',
    'Ruby',
    'Go',
    'Rust',
    'Swift',
    'Kotlin',
    'HTML',
    'CSS',
    'SQL',
    'NoSQL',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'Jenkins',
    'CI/CD',
    'Git',
    'REST',
    'GraphQL',
    'Microservices',
    'Redis',
    'Kafka',
  ];

  const found = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const tech of techKeywords) {
    if (lowerText.includes(tech.toLowerCase())) {
      found.add(tech);
    }
  }

  return Array.from(found);
}

function parseWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];

  const jobPattern = /^([A-Z][^\n]{10,80})\n/gm;
  const entries = text.split(jobPattern).filter(Boolean);

  for (let i = 0; i < entries.length; i += 2) {
    const headerLine = entries[i]?.trim();
    const bodyText = entries[i + 1]?.trim() || '';

    if (!headerLine) continue;

    let company = '';
    let position = '';

    if (headerLine.includes('|')) {
      [company, position] = headerLine.split('|').map((s) => s.trim());
    } else if (headerLine.toLowerCase().includes(' at ')) {
      const parts = headerLine.split(/\s+at\s+/i);
      position = parts[0]?.trim() || '';
      company = parts[1]?.trim() || '';
    } else {
      position = headerLine;
      const bodyLines = bodyText.split('\n');
      company = bodyLines[0] || 'Unknown Company';
    }

    const datePattern =
      /(\w+\s+\d{4}\s*[-–—to]\s*(?:\w+\s+\d{4}|Present|Current))/i;
    const dateMatch = bodyText.match(datePattern);
    const dateInfo = dateMatch
      ? parseDateRange(dateMatch[1])
      : { startDate: '', current: false };
    const locationPattern = /([A-Z][a-z]+,?\s*[A-Z]{2}|Remote)/;
    const location = bodyText.match(locationPattern)?.[0];

    const bullets = extractBulletPoints(bodyText);
    const { responsibilities, achievements } = categorizeBulletPoints(bullets);

    const technologies = extractTechnologies(bodyText);

    const description = bodyText
      .split('\n')
      .filter((line) => !line.match(/^[\s]*[•\-\*]/))
      .join(' ')
      .substring(0, 500);

    experiences.push({
      id: crypto.randomUUID(),
      company: company || 'Unknown Company',
      position: position || 'Unknown Position',
      location,
      ...dateInfo,
      description,
      responsibilities,
      achievements,
      technologies,
    });
  }

  return experiences;
}

function parseEducation(text: string): Education[] {
  const educations: Education[] = [];

  // Split by institution (usually starts with capital letter, medium length)
  const entries = text.split(/\n(?=[A-Z][^\n]{15,80}\n)/g);

  for (const entry of entries) {
    const lines = entry.split('\n').map(normalizeLine).filter(Boolean);
    if (lines.length === 0) continue;

    const institution = lines[0] || 'Unknown Institution';

    // Extract degree and field
    let degree = '';
    let fieldOfStudy = '';

    const degreePattern =
      /\b(Bachelor|Master|PhD|Ph\.D|Doctorate|Associate|Diploma|Certificate)\b.*?\b(of|in|,)\b\s*([^,\n]+)/i;
    const degreeMatch = entry.match(degreePattern);

    if (degreeMatch) {
      degree = degreeMatch[0];
      fieldOfStudy = degreeMatch[3]?.trim() || '';
    } else {
      // Try to find field separately
      const fieldPattern = /\b(?:in|of)\s+([A-Z][^,\n]{5,50})/;
      const fieldMatch = entry.match(fieldPattern);
      degree = lines[1] || 'Degree';
      fieldOfStudy = fieldMatch?.[1] || '';
    }

    // Parse dates
    const datePattern = /(\d{4}\s*[-–—to]\s*(?:\d{4}|Present|Current))/i;
    const dateMatch = entry.match(datePattern);
    const dateInfo = dateMatch
      ? parseDateRange(dateMatch[1])
      : { startDate: '', current: false };

    // Extract GPA
    const gpaPattern = /GPA:?\s*(\d+\.\d+)/i;
    const gpaMatch = entry.match(gpaPattern);
    const gpa = gpaMatch ? parseFloat(gpaMatch[1]) : undefined;

    // Extract honors
    const honorsPattern =
      /\b(summa cum laude|magna cum laude|cum laude|honors?|distinction)\b/gi;
    const honors = entry.match(honorsPattern) || [];

    educations.push({
      id: crypto.randomUUID(),
      institution,
      degree,
      fieldOfStudy,
      ...dateInfo,
      gpa,
      honors: Array.from(new Set(honors)),
    });
  }

  return educations;
}

function parseSkills(text: string): Skills {
  // Split by common delimiters
  const skillTokens = text
    .split(/[,;•\n|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 50);

  // Categorize skills
  const softSkillKeywords = [
    'leadership',
    'communication',
    'teamwork',
    'problem solving',
    'collaboration',
    'time management',
    'project management',
    'critical thinking',
    'creativity',
    'adaptability',
    'mentoring',
    'presentation',
    'negotiation',
  ];

  const languageKeywords = [
    'english',
    'vietnamese',
    'chinese',
    'japanese',
    'korean',
    'french',
    'german',
    'spanish',
    'italian',
    'portuguese',
    'russian',
  ];

  const technical: string[] = [];
  const soft: string[] = [];
  const languages: Array<{
    language: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
  }> = [];

  for (const skill of skillTokens) {
    const lowerSkill = skill.toLowerCase();

    // Check if it's a language skill
    const isLanguage = languageKeywords.some((lang) =>
      lowerSkill.includes(lang),
    );
    if (isLanguage) {
      // Try to extract proficiency
      let proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native' =
        'intermediate';
      if (lowerSkill.includes('native') || lowerSkill.includes('fluent'))
        proficiency = 'native';
      else if (
        lowerSkill.includes('advanced') ||
        lowerSkill.includes('proficient')
      )
        proficiency = 'advanced';
      else if (lowerSkill.includes('basic') || lowerSkill.includes('beginner'))
        proficiency = 'beginner';

      languages.push({ language: skill, proficiency });
      continue;
    }
    const isSoftSkill = softSkillKeywords.some((soft) =>
      lowerSkill.includes(soft),
    );
    if (isSoftSkill) {
      soft.push(skill);
    } else {
      technical.push(skill);
    }
  }

  return {
    technical: Array.from(new Set(technical)),
    soft: Array.from(new Set(soft)),
    languages,
  };
}

export function parseResume(resumeText: string): ParsedResume {
  const cleanedText = cleanText(resumeText);
  const sections = splitIntoSections(cleanedText);

  const personalInfo = extractPersonalInfo(sections.HEADER || '');

  const summary = sections.SUMMARY || undefined;

  const workExperience = sections.EXPERIENCE
    ? parseWorkExperience(sections.EXPERIENCE)
    : [];

  const education = sections.EDUCATION
    ? parseEducation(sections.EDUCATION)
    : [];

  const skills = sections.SKILLS
    ? parseSkills(sections.SKILLS)
    : { technical: [], soft: [], languages: [] };

  const certifications: Certification[] = [];

  const projects: Project[] = [];

  const awards: string[] = [];

  const languages = skills.languages.map((l) => l.language);

  return {
    personalInfo,
    summary,
    workExperience,
    education,
    skills,
    certifications,
    projects,
    awards,
    languages,
    rawSections: sections,
  };
}

export function toCVContent(parsed: ParsedResume): CVContent {
  return {
    personalInfo: {
      name: parsed.personalInfo.name,
      email: parsed.personalInfo.email,
      phone: parsed.personalInfo.phone,
      address: parsed.personalInfo.location,
      linkedin: parsed.personalInfo.linkedin,
      github: parsed.personalInfo.github,
      website: parsed.personalInfo.portfolio,
    },
    summary: parsed.summary,
    workExperience: parsed.workExperience.map((exp) => ({
      id: exp.id,
      company: exp.company,
      position: exp.position,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      description: exp.description || '',
      technologies: exp.technologies,
      achievements: exp.achievements,
    })),
    education: parsed.education.map((edu) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      startDate: edu.startDate,
      endDate: edu.endDate,
      gpa: edu.gpa,
      honors: edu.honors,
    })),
    skills: parsed.skills,
    certifications: parsed.certifications,
    projects: parsed.projects,
  };
}

export function parseResumeTextToCVContent(resumeText: string): CVContent {
  const parsed = parseResume(resumeText);
  return toCVContent(parsed);
}
