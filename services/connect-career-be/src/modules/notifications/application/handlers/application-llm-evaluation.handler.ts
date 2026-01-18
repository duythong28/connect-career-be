import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { CV } from 'src/modules/cv-maker/domain/entities/cv.entity';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { ApplicationCreatedEvent } from 'src/modules/applications/domain/events/application-created.event';
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { ApplicationService } from 'src/modules/applications/api/services/application.service';

@Injectable()
@EventsHandler(ApplicationCreatedEvent)
export class ApplicationLLMEvaluationHandler
  implements IEventHandler<ApplicationCreatedEvent> {
  private readonly logger = new Logger(ApplicationLLMEvaluationHandler.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(CV)
    private readonly cvRepository: Repository<CV>,
    private readonly aiService: AIService,
    private readonly applicationService: ApplicationService,
  ) { }

  async handle(event: ApplicationCreatedEvent): Promise<{
    success: boolean;
    meetsRequirements?: boolean;
    explanation?: string;
    error?: string;
  }> {
    //     this.logger.log(
    //       `Evaluating application ${event.applicationId} with LLM for job requirements match`,
    //     );

    //     try {
    //       // Load application with relations
    //       const application = await this.applicationRepository.findOne({
    //         where: { id: event.applicationId },
    //         relations: ['job', 'cv'],
    //       });

    //       if (!application) {
    //         this.logger.warn(
    //           `Application ${event.applicationId} not found for LLM evaluation`,
    //         );
    //         return {
    //           success: false,
    //           error: 'Application not found',
    //         };
    //       }

    //       // Load job with requirements
    //       const job = await this.jobRepository.findOne({
    //         where: { id: event.jobId },
    //       });

    //       if (!job) {
    //         this.logger.warn(`Job ${event.jobId} not found for LLM evaluation`);
    //         return {
    //           success: false,
    //           error: 'Job not found',
    //         };
    //       }

    //       // Check if job has requirements
    //       if (!job.requirements || job.requirements.length === 0) {
    //         this.logger.log(
    //           `Job ${event.jobId} has no requirements, skipping LLM evaluation`,
    //         );
    //         return {
    //           success: false,
    //           error: 'Job has no requirements',
    //         };
    //       }

    //       // Load CV if not already loaded
    //       let cv: CV | null = application.cv || null;
    //       if (!cv && application.cvId) {
    //         cv = await this.cvRepository.findOne({
    //           where: { id: application.cvId },
    //         });
    //       }

    //       // If no CV, skip evaluation
    //       if (!cv || !cv.content) {
    //         this.logger.warn(
    //           `No CV content found for application ${event.applicationId}, skipping LLM evaluation`,
    //         );
    //         return {
    //           success: false,
    //           error: 'No CV content found',
    //         };
    //       }

    //       // Prepare data for LLM evaluation - pass CV as JSON object
    //       const jobRequirements = job.requirements.join('\n- ');
    //       const cvContentJson = JSON.stringify(cv.content, null, 2);

    //       // Create LLM prompt - emphasize that requirements are MANDATORY
    //       const prompt = `You are an expert recruiter evaluating a job application. The candidate's CV MUST meet ALL the job requirements listed below. These are MANDATORY/CRITICAL requirements - if ANY requirement is missing, the candidate MUST be rejected.

    // MANDATORY JOB REQUIREMENTS (ALL must be met):
    // ${jobRequirements}

    // CANDIDATE CV (JSON format):
    // ${cvContentJson}

    // CRITICAL EVALUATION RULES:
    // 1. These are MANDATORY requirements - ALL must be clearly demonstrated in the CV JSON structure
    // 2. Analyze the CV JSON structure: personalInfo, workExperience, education, skills, certifications, projects
    // 3. If the CV is missing ANY requirement, you MUST set "meetsRequirements" to false
    // 4. Be strict - if a requirement is not clearly shown in the CV JSON, it counts as missing
    // 5. Only return true if the CV JSON clearly demonstrates ALL requirements

    // For each requirement, check in the CV JSON:
    // - Check personalInfo, workExperience, education, skills sections
    // - Look for explicit mentions or clear evidence
    // - If uncertain or not clearly shown, mark it as missing

    // Respond in JSON format:
    // {
    //   "meetsRequirements": false,
    //   "explanation": "Detailed explanation. If ANY requirement is missing, clearly state which ones and why the candidate does not meet them based on the CV JSON structure",
    //   "missingRequirements": ["list ALL missing mandatory requirements - this is critical"],
    //   "matchedRequirements": ["list requirements that ARE met in the CV JSON"]
    // }

    // IMPORTANT: 
    // - If missingRequirements array has ANY items, meetsRequirements MUST be false
    // - Be thorough - check EVERY requirement individually against the CV JSON structure
    // - If you cannot find clear evidence of a requirement in the CV JSON, it MUST be listed in missingRequirements`;

    //       // Call LLM
    //       const llmResponse = await this.aiService.generate({
    //         prompt,
    //         temperature: 0.2, // Lower temperature for stricter evaluation
    //         maxOutputTokens: 2048,
    //       });

    //       // Parse LLM response
    //       let evaluationResult: {
    //         meetsRequirements: boolean;
    //         explanation: string;
    //         missingRequirements?: string[];
    //         matchedRequirements?: string[];
    //       };

    //       try {
    //         // Try to extract JSON from response - handle markdown code blocks
    //         let jsonString = llmResponse.content.trim();

    //         // Remove markdown code blocks if present
    //         jsonString = jsonString
    //           .replace(/\n?/g, '')
    //           .replace(/```\n?/g, '')
    //           .trim();

    //         // Try to find JSON object
    //         const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    //         if (jsonMatch) {
    //           evaluationResult = JSON.parse(jsonMatch[0]);

    //           // Validate required fields
    //           if (typeof evaluationResult.meetsRequirements !== 'boolean') {
    //             throw new Error('meetsRequirements must be boolean');
    //           }
    //           if (!evaluationResult.explanation) {
    //             throw new Error('explanation is required');
    //           }

    //           // CRITICAL: If there are missing requirements, force meetsRequirements to false
    //           if (
    //             evaluationResult.missingRequirements &&
    //             evaluationResult.missingRequirements.length > 0
    //           ) {
    //             evaluationResult.meetsRequirements = false;
    //             this.logger.log(
    //               `Application ${event.applicationId} has missing requirements: ${evaluationResult.missingRequirements.join(', ')}`,
    //             );
    //           }
    //         } else {
    //           throw new Error('No JSON object found in response');
    //         }
    //       } catch (parseError) {
    //         this.logger.warn(
    //           `LLM response for application ${event.applicationId} is not valid JSON: ${parseError.message}. Response: ${llmResponse.content.substring(0, 200)}`,
    //         );
    //         // Default to rejection if parsing fails (safer approach)
    //         evaluationResult = {
    //           meetsRequirements: false,
    //           explanation:
    //             'Unable to parse LLM evaluation. Application requires manual review.',
    //           missingRequirements: [
    //             'Unable to verify requirements due to parsing error',
    //           ],
    //         };
    //       }

    //       // If candidate doesn't meet requirements (has missing requirements), reject immediately
    //       if (
    //         !evaluationResult.meetsRequirements ||
    //         (evaluationResult.missingRequirements &&
    //           evaluationResult.missingRequirements.length > 0)
    //       ) {
    //         const rejectionReason =
    //           'LLM Evaluation: CV does not meet mandatory job requirements';
    //         const rejectionFeedback = `LLM Evaluation Result:\n\n${evaluationResult.explanation}\n\n${
    //           evaluationResult.missingRequirements?.length
    //             ? `MISSING MANDATORY REQUIREMENTS (CRITICAL):\n${evaluationResult.missingRequirements.map((req) => `- ${req}`).join('\n')}\n\n`
    //             : ''
    //         }${
    //           evaluationResult.matchedRequirements?.length
    //             ? `Matched Requirements:\n${evaluationResult.matchedRequirements.map((req) => `- ${req}`).join('\n')}`
    //             : ''
    //         }`;

    //         // Reject application using the application service
    //         const rejectedBy = event?.recruiterId || 'system';

    //         try {
    //           await this.applicationService.rejectApplication(
    //             event.applicationId,
    //             rejectionReason,
    //             rejectionFeedback,
    //             rejectedBy,
    //           );

    //           this.logger.log(
    //             `Application ${event.applicationId} rejected by LLM evaluation. Missing requirements: ${evaluationResult.missingRequirements?.join(', ') || 'N/A'}`,
    //           );
    //         } catch (rejectError) {
    //           this.logger.error(
    //             `Failed to reject application ${event.applicationId}: ${rejectError.message}`,
    //             rejectError.stack,
    //           );
    //         }

    //         return {
    //           success: true,
    //           meetsRequirements: false,
    //           explanation: evaluationResult.explanation,
    //         };
    //       } else {
    //         this.logger.log(
    //           `Application ${event.applicationId} passed LLM evaluation - all mandatory requirements met`,
    //         );
    //         return {
    //           success: true,
    //           meetsRequirements: true,
    //           explanation: evaluationResult.explanation,
    //         };
    //       }
    //     } catch (error) {
    //       this.logger.error(
    //         `Error in LLM evaluation for application ${event.applicationId}: ${error.message}`,
    //         error.stack,
    //       );
    //       return {
    //         success: false,
    //         error: error.message,
    //       };
    //     }
    throw NotImplementedException;
  }
  async evaluateApplication(applicationId: string): Promise<{
    success: boolean;
    meetsRequirements?: boolean;
    explanation?: string;
    error?: string;
  }> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: ['job', 'cv'],
      });

      if (!application) {
        return {
          success: false,
          error: 'Application not found',
        };
      }

      const job = await this.jobRepository.findOne({
        where: { id: application.jobId },
      });

      if (!job) {
        return {
          success: false,
          error: 'Job not found',
        };
      }

      if (!job.requirements || job.requirements.length === 0) {
        return {
          success: false,
          error: 'Job has no requirements',
        };
      }

      let cv: CV | null = application.cv || null;
      if (!cv && application.cvId) {
        cv = await this.cvRepository.findOne({
          where: { id: application.cvId },
        });
      }

      if (!cv || !cv.content) {
        return {
          success: false,
          error: 'No CV content found',
        };
      }
      const cvContentText = this.formatCVContent(cv);
      console.log('cvContentText', cvContentText);

      if (!cv || !cv.content) {
        this.logger.warn(
          `No CV content found for application ${applicationId}, skipping LLM evaluation`,
        );
        return {
          success: false,
          error: 'No CV content found',
        };
      }

      // Prepare data for LLM evaluation - pass CV as JSON object
      const jobRequirements = job.requirements.join('\n- ');
      const cvContentJson = JSON.stringify(cv.content, null, 2);

      // Create LLM prompt - emphasize that requirements are MANDATORY
      const prompt = `You are an expert recruiter evaluating a job application. The candidate's CV MUST meet ALL the job requirements listed below. These are MANDATORY/CRITICAL requirements - if ANY requirement is missing, the candidate MUST be rejected.

MANDATORY JOB REQUIREMENTS (ALL must be met):
${jobRequirements}

CANDIDATE CV (JSON format):
${cvContentJson}

CRITICAL EVALUATION RULES:
1. These are MANDATORY requirements - ALL must be clearly demonstrated in the CV JSON structure
2. Analyze the CV JSON structure: personalInfo, workExperience, education, skills, certifications, projects
3. If the CV is missing ANY requirement, you MUST set "meetsRequirements" to false
4. Be strict - if a requirement is not clearly shown in the CV JSON, it counts as missing
5. Only return true if the CV JSON clearly demonstrates ALL requirements

For each requirement, check in the CV JSON:
- Check personalInfo, workExperience, education, skills sections
- Look for explicit mentions or clear evidence
- If uncertain or not clearly shown, mark it as missing

Respond in JSON format:
{
  "meetsRequirements": false,
  "explanation": "Detailed explanation. If ANY requirement is missing, clearly state which ones and why the candidate does not meet them based on the CV JSON structure",
  "missingRequirements": ["list ALL missing mandatory requirements - this is critical"],
  "matchedRequirements": ["list requirements that ARE met in the CV JSON"]
}

IMPORTANT: 
- If missingRequirements array has ANY items, meetsRequirements MUST be false
- Be thorough - check EVERY requirement individually against the CV JSON structure
- If you cannot find clear evidence of a requirement in the CV JSON, it MUST be listed in missingRequirements`;

      // Call LLM
      const llmResponse = await this.aiService.generate({
        prompt,
        temperature: 0.2, // Lower temperature for stricter evaluation
        maxOutputTokens: 2048,
      });

      let evaluationResult: {
        meetsRequirements: boolean;
        explanation: string;
        missingRequirements?: string[];
        matchedRequirements?: string[];
      };

      try {
        let jsonString = llmResponse.content.trim();
        jsonString = jsonString
          .replace(/\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluationResult = JSON.parse(jsonMatch[0]);

          if (typeof evaluationResult.meetsRequirements !== 'boolean') {
            throw new Error('meetsRequirements must be boolean');
          }
          if (!evaluationResult.explanation) {
            throw new Error('explanation is required');
          }
        } else {
          throw new Error('No JSON object found in response');
        }
      } catch (parseError) {
        this.logger.warn(
          `LLM response for application ${applicationId} is not valid JSON: ${parseError.message}`,
        );
        return {
          success: false,
          error: `Failed to parse LLM response: ${parseError.message}`,
        };
      }

      return {
        success: true,
        meetsRequirements: evaluationResult.meetsRequirements,
        explanation: evaluationResult.explanation,
      };
    } catch (error) {
      this.logger.error(
        `Error in LLM evaluation for application ${applicationId}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }
  private formatCVContent(cv: CV): string {
    if (!cv.content) {
      // If no structured content, try extractedText
      return cv.extractedText || 'No CV content available';
    }

    // If content is already a string, return it
    if (typeof cv.content === 'string') {
      return cv.content;
    }

    // Format structured CV content into readable text
    const content = cv.content;
    let formattedText = '';

    // Personal Info
    if (content.personalInfo) {
      const pi = content.personalInfo;
      formattedText += `PERSONAL INFORMATION:\n`;
      if (pi.name) formattedText += `Name: ${pi.name}\n`;
      if (pi.title) formattedText += `Title: ${pi.title}\n`;
      if (pi.email) formattedText += `Email: ${pi.email}\n`;
      if (pi.phone) formattedText += `Phone: ${pi.phone}\n`;
      if (pi.address) formattedText += `Address: ${pi.address}\n`;
      if (pi.linkedin) formattedText += `LinkedIn: ${pi.linkedin}\n`;
      if (pi.github) formattedText += `GitHub: ${pi.github}\n`;
      if (pi.website) formattedText += `Website: ${pi.website}\n`;
      formattedText += '\n';
    }

    // Summary
    if (content.summary) {
      formattedText += `PROFESSIONAL SUMMARY:\n${content.summary}\n\n`;
    }

    // Work Experience
    if (content.workExperience && content.workExperience.length > 0) {
      formattedText += `WORK EXPERIENCE:\n`;
      content.workExperience.forEach((exp) => {
        formattedText += `${exp.position} at ${exp.company}\n`;
        formattedText += `Period: ${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : 'N/A')}\n`;
        if (exp.description)
          formattedText += `Description: ${exp.description}\n`;
        if (exp.technologies && exp.technologies.length > 0) {
          formattedText += `Technologies: ${exp.technologies.join(', ')}\n`;
        }
        if (exp.achievements && exp.achievements.length > 0) {
          formattedText += `Achievements: ${exp.achievements.join('; ')}\n`;
        }
        formattedText += '\n';
      });
    }

    // Education
    if (content.education && content.education.length > 0) {
      formattedText += `EDUCATION:\n`;
      content.education.forEach((edu) => {
        formattedText += `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution}\n`;
        formattedText += `Period: ${edu.startDate} - ${edu.endDate || 'N/A'}\n`;
        if (edu.gpa) formattedText += `GPA: ${edu.gpa}\n`;
        if (edu.honors && edu.honors.length > 0) {
          formattedText += `Honors: ${edu.honors.join(', ')}\n`;
        }
        formattedText += '\n';
      });
    }

    // Skills
    if (content.skills) {
      formattedText += `SKILLS:\n`;
      if (content.skills.technical && content.skills.technical.length > 0) {
        formattedText += `Technical: ${content.skills.technical.join(', ')}\n`;
      }
      if (content.skills.soft && content.skills.soft.length > 0) {
        formattedText += `Soft Skills: ${content.skills.soft.join(', ')}\n`;
      }
      if (content.skills.languages && content.skills.languages.length > 0) {
        const languages = content.skills.languages.map(
          (lang) => `${lang.language} (${lang.proficiency})`,
        );
        formattedText += `Languages: ${languages.join(', ')}\n`;
      }
      formattedText += '\n';
    }

    // Certifications
    if (content.certifications && content.certifications.length > 0) {
      formattedText += `CERTIFICATIONS:\n`;
      content.certifications.forEach((cert) => {
        formattedText += `${cert.name} from ${cert.issuer}\n`;
        if (cert.issueDate) formattedText += `Issued: ${cert.issueDate}\n`;
        if (cert.credentialId)
          formattedText += `Credential ID: ${cert.credentialId}\n`;
        formattedText += '\n';
      });
    }

    // Projects
    if (content.projects && content.projects.length > 0) {
      formattedText += `PROJECTS:\n`;
      content.projects.forEach((project) => {
        formattedText += `${project.name}\n`;
        if (project.description)
          formattedText += `Description: ${project.description}\n`;
        if (project.technologies && project.technologies.length > 0) {
          formattedText += `Technologies: ${project.technologies.join(', ')}\n`;
        }
        formattedText += '\n';
      });
    }

    // Custom Sections
    if (content.customSections && content.customSections.length > 0) {
      content.customSections
        .sort((a, b) => a.order - b.order)
        .forEach((section) => {
          formattedText += `${section.title.toUpperCase()}:\n${section.content}\n\n`;
        });
    }

    return formattedText.trim() || JSON.stringify(content, null, 2);
  }
}
