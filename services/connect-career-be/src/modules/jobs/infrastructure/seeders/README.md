# LinkedIn Jobs Seeder

This seeder imports LinkedIn job listings from JSON files and automatically creates the necessary organizations and HR users for each job.

## Features

- ✅ **Automatic Organization Creation**: Creates organizations for companies if they don't exist in the system
- ✅ **HR User Generation**: Creates an HR user for each organization to act as the job poster
- ✅ **Batch Processing**: Processes jobs in batches of 500 for memory efficiency
- ✅ **Streaming JSON Parser**: Uses stream processing to handle large JSON files without memory issues
- ✅ **Duplicate Prevention**: Checks for existing jobs by LinkedIn job posting ID
- ✅ **Industry Mapping**: Creates or finds industries based on job data
- ✅ **Company Logo Handling**: Stores company logos from LinkedIn as file entities
- ✅ **Keyword Extraction**: Automatically extracts keywords from job functions and industries
- ✅ **Caching**: Uses in-memory caching to minimize database lookups

## Data Sources

The seeder processes all JSON files matching the pattern:

- `linkedin_job_listings_information.json`
- `linkedin_job_listings_information_2.json`
- `linkedin_job_listings_information_3.json`
- `linkedin_job_listings_information_4.json`
- `linkedin_job_listings_information_5.json`

## Usage

### 1. Prepare the Database

Make sure you have run the following seeders first:

```typescript
// 1. Seed roles and permissions (REQUIRED)
const rolesSeeder = app.get(DefaultRolesSeeder);
await rolesSeeder.seed();

// 2. Seed industries (RECOMMENDED)
const industrySeeder = app.get(IndustrySeeder);
await industrySeeder.seed();
```

### 2. Run the Job Seeder

Uncomment the following lines in `src/main.ts`:

```typescript
const jobsSeeder = app.get(LinkedInJobsSeeder);
await jobsSeeder.seedAllFiles();
```

Then start your application:

```bash
npm run start:dev
```

### 3. Seed from a Single File (Optional)

If you want to seed from a specific file:

```typescript
const jobsSeeder = app.get(LinkedInJobsSeeder);
await jobsSeeder.seedFromFile(
  'src/modules/jobs/infrastructure/seeders/linkedin_job_listings_information.json',
);
```

## What Gets Created

For each job posting, the seeder:

1. **Job Entity**
   - Maps all LinkedIn job data to the Job entity
   - Sets source as `LINKEDIN`
   - Stores LinkedIn-specific data in JSONB fields
   - Extracts and stores keywords

2. **Organization** (if doesn't exist)
   - Company name
   - Company logo (as File entity)
   - Industry association
   - Social media links (LinkedIn)
   - Default working days and policies

3. **HR User** (if doesn't exist)
   - Email format: `hr.{organizationId}@{company-slug}.seeded`
   - Assigned to "Employer" role
   - Linked to the organization
   - Acts as the job poster

4. **Industry** (if doesn't exist)
   - Created from job industries field
   - Falls back to "Technology" if not specified

5. **Company Logo File** (if available)
   - Stored as a File entity
   - Linked to the organization
   - Tagged for easy retrieval

## Data Mapping

### LinkedIn Job → Job Entity

| LinkedIn Field              | Job Entity Field              | Notes               |
| --------------------------- | ----------------------------- | ------------------- |
| `job_posting_id`            | `sourceId`                    | Unique identifier   |
| `job_title`                 | `title`                       |                     |
| `company_name`              | `companyName`                 |                     |
| `company_id`                | `companyId`                   | LinkedIn company ID |
| `company_logo`              | `companyLogo`                 | URL to logo         |
| `company_url`               | `companyUrl`                  |                     |
| `job_location`              | `location`                    |                     |
| `job_description_formatted` | `description`                 | HTML formatted      |
| `job_summary`               | `summary`                     |                     |
| `job_employment_type`       | `type`                        | Mapped to enum      |
| `job_seniority_level`       | `seniorityLevel`              |                     |
| `job_function`              | `jobFunction`                 |                     |
| `job_industries`            | `keywords`                    | Extracted to array  |
| `job_base_pay_range`        | `salary`                      | Human-readable      |
| `base_salary`               | `salaryDetails`               | Structured JSON     |
| `job_num_applicants`        | `applications`                |                     |
| `apply_link`                | `applyLink`                   |                     |
| `job_posted_date`           | `postedDate`                  |                     |
| `discovery_input`           | `linkedinData.discoveryInput` | JSONB               |
| `job_poster`                | `linkedinData.jobPoster`      | JSONB               |

## Performance

- **Batch Size**: 500 jobs per batch
- **Memory Management**: Automatic garbage collection after each batch
- **Caching**: In-memory caching for organizations, users, industries, and roles
- **Streaming**: Processes JSON files using streams to handle large files

## Example Output

```
🚀 Starting LinkedIn jobs seeding process...
✅ System resources initialized
Found 5 JSON files to process

📂 Processing file: linkedin_job_listings_information.json
💾 Saved batch (processed: 500, skipped: 0)
💾 Saved batch (processed: 1000, skipped: 0)
💾 Saved final batch of 324 jobs
✅ Completed linkedin_job_listings_information.json: 1324 jobs, 0 skipped

📂 Processing file: linkedin_job_listings_information_2.json
💾 Saved batch (processed: 500, skipped: 125)
...

🎉 Seeding completed! Total: 5428 jobs created, 238 skipped
```

## Error Handling

The seeder includes robust error handling:

- **Duplicate Detection**: Skips jobs that already exist (by `sourceId`)
- **Missing Data**: Logs warnings and skips jobs with missing required fields
- **Database Errors**: Logs errors but continues processing remaining jobs
- **Resource Cleanup**: Clears caches after completion

## Troubleshooting

### Memory Issues

If you encounter memory issues with large files:

1. Reduce `BATCH_SIZE` in the seeder (default: 500)
2. Run with Node.js `--max-old-space-size` flag:
   ```bash
   node --max-old-space-size=4096 dist/main
   ```

### Duplicate Jobs

The seeder automatically skips jobs that already exist. To re-seed:

```sql
-- Clear existing LinkedIn jobs
DELETE FROM jobs WHERE source = 'linkedin';
```

### Organizations Not Linking

If organizations aren't being created or linked properly:

1. Check that the Organization entity is properly registered in JobsModule
2. Verify that the Industry seeder has been run
3. Check database logs for constraint violations

## Database Schema

Ensure your database includes these tables:

- `jobs`
- `organizations`
- `users`
- `roles`
- `industries`
- `files`

## Dependencies

The seeder requires these TypeORM repositories:

- `JobRepository`
- `OrganizationRepository`
- `UserRepository`
- `IndustryRepository`
- `RoleRepository`
- `FileRepository`

## Future Enhancements

Potential improvements:

- [ ] Parallel file processing
- [ ] Resume capability for interrupted seeding
- [ ] Job update detection and sync
- [ ] Advanced company matching (by LinkedIn ID, website, etc.)
- [ ] Deduplication of similar jobs
- [ ] Job expiration management
- [ ] Analytics and reporting
