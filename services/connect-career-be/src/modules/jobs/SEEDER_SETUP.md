# Job Seeder Setup Complete! 🎉

## What Was Created

### 1. Job Entity (`job.entity.ts`)

A unified job entity that handles both:

- **Internal jobs**: Created by employers in your system
- **LinkedIn jobs**: Imported from LinkedIn JSON data

**Key Features:**

- Flexible salary fields (both human-readable and structured)
- Source tracking (internal, LinkedIn, external)
- Rich metadata storage (JSONB for LinkedIn-specific data)
- Factory method `fromLinkedIn()` for easy conversion
- Helper methods for status management

### 2. LinkedIn Jobs Seeder (`linkedin-jobs.seeder.ts`)

A comprehensive seeder that:

- ✅ Reads from all LinkedIn JSON files automatically
- ✅ Creates organizations for each company if missing
- ✅ Creates HR users for each organization
- ✅ Uses streaming for memory efficiency
- ✅ Batch processing (500 jobs per batch)
- ✅ Caching to minimize database lookups
- ✅ Duplicate detection (skips existing jobs)
- ✅ Automatic industry creation
- ✅ Company logo handling

### 3. Jobs Module (`jobs.module.ts`)

Updated to register:

- Job entity
- LinkedInJobsSeeder provider
- All necessary dependencies

### 4. App Module (`app.module.ts`)

Updated to import the JobsModule.

### 5. Documentation

- **README.md**: Comprehensive seeder documentation
- **SEEDER_SETUP.md**: This file!

## How to Use

### Step 1: Prepare Dependencies

Before running the job seeder, make sure these seeders have been run:

```typescript
// 1. REQUIRED: Roles and permissions
const rolesSeeder = app.get(DefaultRolesSeeder);
await rolesSeeder.seed();

// 2. OPTIONAL: Industries (recommended)
const industrySeeder = app.get(IndustrySeeder);
await industrySeeder.seed();
```

### Step 2: Run the Job Seeder

In `src/main.ts`, uncomment these lines:

```typescript
const jobsSeeder = app.get(LinkedInJobsSeeder);
await jobsSeeder.seedAllFiles();
```

Then start your application:

```bash
npm run start:dev
```

### Step 3: Monitor Progress

You'll see output like:

```
🚀 Starting LinkedIn jobs seeding process...
✅ System resources initialized
Found 5 JSON files to process

📂 Processing file: linkedin_job_listings_information.json
💾 Saved batch (processed: 500, skipped: 0)
💾 Saved batch (processed: 1000, skipped: 0)
✅ Completed: 1324 jobs, 0 skipped

🎉 Seeding completed! Total: 5428 jobs created, 238 skipped
```

## What Gets Created

For each LinkedIn job, the seeder automatically creates:

### 1. Job Record

- All job details mapped from LinkedIn
- Status: `ACTIVE`
- Source: `LINKEDIN`
- Keywords extracted from job data

### 2. Organization (if doesn't exist)

- Company name and details
- Logo (stored as File entity)
- Industry association
- Default working policies
- LinkedIn social media link

### 3. HR User (if doesn't exist)

- Email format: `hr.{orgId}@{company-slug}.seeded`
- Assigned to "Employer" role
- Linked to the organization
- Acts as the job poster

### 4. Industry (if doesn't exist)

- Created from job industries field
- Falls back to "Technology" if not specified

## Data Mapping

| LinkedIn Field              | Job Entity      | Notes                |
| --------------------------- | --------------- | -------------------- |
| `job_posting_id`            | `sourceId`      | Unique identifier    |
| `job_title`                 | `title`         | Job title            |
| `company_name`              | `companyName`   | Company name         |
| `company_id`                | `companyId`     | LinkedIn company ID  |
| `company_logo`              | `companyLogo`   | Logo URL             |
| `job_location`              | `location`      | Location string      |
| `job_description_formatted` | `description`   | HTML description     |
| `job_employment_type`       | `type`          | Mapped to enum       |
| `base_salary`               | `salaryDetails` | Structured JSON      |
| `job_num_applicants`        | `applications`  | Number of applicants |

## Configuration

The seeder has some configurable parameters:

```typescript
private readonly BATCH_SIZE = 500; // Jobs per batch
```

Adjust this if you encounter memory issues.

## Troubleshooting

### "Organization already exists" errors

This is normal - the seeder will reuse existing organizations.

### Memory issues

1. Reduce `BATCH_SIZE` in the seeder
2. Run with more memory: `node --max-old-space-size=4096 dist/main`

### Duplicate jobs

The seeder automatically skips jobs that already exist. To re-seed:

```sql
DELETE FROM jobs WHERE source = 'linkedin';
```

### Missing roles

If you see "Employer role not found", make sure to run:

```typescript
const rolesSeeder = app.get(DefaultRolesSeeder);
await rolesSeeder.seed();
```

## Database Schema

The seeder expects these tables to exist:

- `jobs` - Job listings
- `organizations` - Companies
- `users` - User accounts (including HR users)
- `roles` - User roles
- `industries` - Industry categories
- `files` - File storage (for logos)

## Performance

Expected performance:

- **~500-1000 jobs/minute** (depending on hardware)
- **Memory usage**: ~200-500MB during seeding
- **Database**: PostgreSQL recommended

## Next Steps

After seeding, you can:

1. **Query jobs:**

   ```typescript
   const jobs = await jobRepo.find({
     where: { source: JobSource.LINKEDIN, status: JobStatus.ACTIVE },
   });
   ```

2. **Create job API endpoints** to expose jobs to your frontend

3. **Build job search functionality** using the keywords field

4. **Add job recommendation engine** based on user profiles

5. **Implement job application tracking**

## Files Modified

- ✅ `src/modules/jobs/domain/entities/job.entity.ts` (created)
- ✅ `src/modules/jobs/infrastructure/seeders/linkedin-jobs.seeder.ts` (created)
- ✅ `src/modules/jobs/infrastructure/seeders/README.md` (created)
- ✅ `src/modules/jobs/jobs.module.ts` (updated)
- ✅ `src/app.module.ts` (updated)
- ✅ `src/main.ts` (updated)

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify database connection
3. Ensure all dependencies are properly installed
4. Check that JSON files are in the correct location

Happy seeding! 🚀
