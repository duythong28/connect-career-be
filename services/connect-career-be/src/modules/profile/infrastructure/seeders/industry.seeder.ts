import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Industry } from '../../domain/entities/industry.entity';
import { Repository } from 'typeorm';

interface IndustrySeedData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  parentName?: string;
  keywords?: string[];
  isActive?: boolean;
  parentId?: string;
}
@Injectable()
export class IndustrySeeder {
  private readonly logger = new Logger(IndustrySeeder.name);

  constructor(
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Seeding industries...');
    const existingCount = await this.industryRepository.count();
    if (existingCount > 0) {
      this.logger.log('Industries already seeded, skipping...');
      return;
    }
    const industriesData = this.getIndustriesData();
    const parentIndustries = industriesData.filter(
      (industry) => !industry.parentName,
    );
    for (const industryData of parentIndustries) {
      await this.createIndustry(industryData);
    }
    const childIndustries = industriesData.filter(
      (industry) => industry.parentName,
    );
    for (const industryData of childIndustries) {
      await this.createIndustry(industryData);
    }

    console.log('✅ Industries seeded successfully!');
  }
  private async createIndustry(
    industryData: IndustrySeedData,
  ): Promise<Industry> {
    let parentId = undefined;

    if (industryData.parentName) {
      const parent = await this.industryRepository.findOneBy({
        name: industryData.parentName,
      });
      if (parent) {
        (parentId as string | undefined) = parent.id.toString();
      }
    }

    const industry = this.industryRepository.create({
      name: industryData.name,
      description: industryData.description,
      sortOrder: industryData.sortOrder || 0,
      parentId,
      keywords: industryData.keywords || [],
      isActive: true,
    });

    return this.industryRepository.save(industry);
  }

  private getIndustriesData(): IndustrySeedData[] {
    return [
      {
        name: 'Technology & IT',
        description:
          'Information technology, software development, and tech services',
        sortOrder: 1,
        keywords: [
          'tech',
          'it',
          'software',
          'development',
          'programming',
          'digital',
        ],
      },
      {
        name: 'Healthcare & Medical',
        description: 'Medical services, healthcare technology, and wellness',
        sortOrder: 2,
        keywords: ['healthcare', 'medical', 'health', 'wellness', 'medicine'],
      },
      {
        name: 'Finance & Banking',
        description: 'Financial services, banking, and fintech',
        sortOrder: 3,
        keywords: [
          'finance',
          'banking',
          'fintech',
          'financial services',
          'money',
        ],
      },
      {
        name: 'Education & Training',
        description: 'Educational institutions and training services',
        sortOrder: 4,
        keywords: ['education', 'training', 'learning', 'school', 'university'],
      },
      {
        name: 'Manufacturing & Production',
        description: 'Manufacturing, production, and industrial services',
        sortOrder: 5,
        keywords: [
          'manufacturing',
          'production',
          'industrial',
          'factory',
          'assembly',
        ],
      },
      {
        name: 'Retail & E-commerce',
        description: 'Retail trade, online stores, and consumer products',
        sortOrder: 6,
        keywords: ['retail', 'ecommerce', 'shopping', 'consumer', 'wholesale'],
      },
      {
        name: 'Logistics & Transportation',
        description: 'Logistics, shipping, warehousing, and transportation',
        sortOrder: 7,
        keywords: [
          'logistics',
          'shipping',
          'transportation',
          'delivery',
          'supply chain',
        ],
      },
      {
        name: 'Energy & Utilities',
        description: 'Energy, oil & gas, renewable power, and utilities',
        sortOrder: 8,
        keywords: ['energy', 'oil', 'gas', 'renewable', 'electricity'],
      },
      {
        name: 'Construction & Real Estate',
        description: 'Construction, infrastructure, and property development',
        sortOrder: 9,
        keywords: [
          'construction',
          'real estate',
          'property',
          'housing',
          'infrastructure',
        ],
      },
      {
        name: 'Media & Entertainment',
        description: 'Media, broadcasting, film, music, and entertainment',
        sortOrder: 10,
        keywords: ['media', 'entertainment', 'film', 'music', 'broadcast'],
      },
      {
        name: 'Software Development',
        description: 'Custom software development and programming services',
        sortOrder: 1,
        parentName: 'Technology & IT',
        keywords: ['software', 'development', 'programming', 'coding', 'apps'],
      },
      {
        name: 'Web Development',
        description: 'Frontend and backend web development',
        sortOrder: 2,
        parentName: 'Technology & IT',
        keywords: [
          'web',
          'frontend',
          'backend',
          'javascript',
          'react',
          'nodejs',
        ],
      },
      {
        name: 'Mobile Development',
        description: 'iOS and Android app development',
        sortOrder: 3,
        parentName: 'Technology & IT',
        keywords: ['mobile', 'ios', 'android', 'react-native', 'flutter'],
      },
      {
        name: 'Artificial Intelligence & Machine Learning',
        description: 'AI, ML, data science, and automation',
        sortOrder: 4,
        parentName: 'Technology & IT',
        keywords: [
          'ai',
          'artificial intelligence',
          'machine learning',
          'data science',
        ],
      },
      {
        name: 'Cybersecurity',
        description:
          'Security solutions, penetration testing, and data protection',
        sortOrder: 5,
        parentName: 'Technology & IT',
        keywords: [
          'cybersecurity',
          'security',
          'hacking',
          'data protection',
          'privacy',
        ],
      },
      {
        name: 'Pharmaceuticals',
        description: 'Drug development, biotech, and pharmaceutical companies',
        sortOrder: 1,
        parentName: 'Healthcare & Medical',
        keywords: ['pharma', 'medicine', 'biotech', 'drugs'],
      },
      {
        name: 'Hospitals & Clinics',
        description: 'Healthcare providers and hospital networks',
        sortOrder: 2,
        parentName: 'Healthcare & Medical',
        keywords: ['hospital', 'clinic', 'doctor', 'healthcare provider'],
      },
      {
        name: 'Health Tech',
        description: 'Digital health, health apps, and telemedicine',
        sortOrder: 3,
        parentName: 'Healthcare & Medical',
        keywords: [
          'telemedicine',
          'digital health',
          'wearables',
          'health apps',
        ],
      },
      {
        name: 'Fintech',
        description: 'Financial technology and digital payment solutions',
        sortOrder: 1,
        parentName: 'Finance & Banking',
        keywords: ['fintech', 'payments', 'digital banking', 'wallet'],
      },
      {
        name: 'Investment & Asset Management',
        description: 'Investment funds, wealth management, and trading',
        sortOrder: 2,
        parentName: 'Finance & Banking',
        keywords: ['investment', 'asset management', 'trading', 'stocks'],
      },
      {
        name: 'Insurance',
        description: 'Insurance companies and risk management services',
        sortOrder: 3,
        parentName: 'Finance & Banking',
        keywords: ['insurance', 'risk', 'coverage', 'policy'],
      },
      {
        name: 'E-Learning',
        description: 'Online education platforms and digital training',
        sortOrder: 1,
        parentName: 'Education & Training',
        keywords: ['elearning', 'online courses', 'mooc', 'edtech'],
      },
      {
        name: 'Corporate Training',
        description: 'Professional training and workforce development',
        sortOrder: 2,
        parentName: 'Education & Training',
        keywords: [
          'corporate training',
          'skills',
          'workforce',
          'professional development',
        ],
      },
      {
        name: 'Schools & Universities',
        description: 'Educational institutions and higher learning',
        sortOrder: 3,
        parentName: 'Education & Training',
        keywords: ['school', 'university', 'college', 'academy'],
      },
    ];
  }
}
