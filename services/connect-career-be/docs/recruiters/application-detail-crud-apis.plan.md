<!-- d9c553ca-7380-402c-af55-c44bd4a1dd05 2567b5eb-7c2e-435e-870b-926a0094d6ef -->
# Complete Application Management API for Recruiter UI

## 1. Update Application Entity

**File**: `services/connect-career-be/src/modules/applications/domain/entities/application.entity.ts`

Add new fields to support the UI:

- `candidateSnapshot` (jsonb) - stores candidate data at application time
- `isFlagged` (boolean) - flag important applications  
- `flagReason` (text) - reason for flagging
- `tags` (simple-array) - application tags
- `assignedToUserId` (uuid) - assigned recruiter
- `customFields` (jsonb) - flexible custom data

Update `StatusHistory` interface to match the new structure with `reason` field.

## 2. Create DTOs

**File**: `services/connect-career-be/src/modules/applications/api/dtos/application-detail.dto.ts`

Create comprehensive DTOs:

- `ApplicationDetailResponseDto` - full application data with all relations
- `CandidateSnapshotDto` - candidate info snapshot
- `ChangeApplicationStageDto` - for pipeline-based status changes
- `UpdateApplicationNotesDto` - for adding/updating notes
- `FlagApplicationDto` - for flagging applications

**File**: `services/connect-career-be/src/modules/applications/api/dtos/interview.dto.ts`

Interview management DTOs:

- `CreateInterviewDto` - schedule new interview
- `UpdateInterviewDto` - update interview details
- `SubmitInterviewFeedbackDto` - add interviewer feedback
- `RescheduleInterviewDto` - reschedule interview

**File**: `services/connect-career-be/src/modules/applications/api/dtos/offer.dto.ts`

Offer management DTOs:

- `CreateOfferDto` - create new offer with compensation details
- `UpdateOfferDto` - revise offer
- `RecordOfferResponseDto` - record candidate's response
- `OfferDetailResponseDto` - full offer details

**File**: `services/connect-career-be/src/modules/applications/api/dtos/communication.dto.ts`

Communication DTOs:

- `LogCommunicationDto` - log email/phone/meeting
- `CommunicationLogResponseDto` - communication history

## 3. Create Application Status Service

**File**: `services/connect-career-be/src/modules/applications/api/services/application-status.service.ts`

Pipeline-based status management service with methods:

- `changeApplicationStage(applicationId, stageKey, changedBy, notes)` - move application through pipeline stages
- `getAvailableNextStages(applicationId)` - get valid next stages from pipeline
- `validateStageTransition(pipeline, fromStageKey, toStageKey)` - validate transitions
- `mapStageToApplicationStatus(stage)` - map pipeline stage to application status
- `getCurrentApplicationStage(application)` - get current pipeline stage

## 4. Create Interview Service

**File**: `services/connect-career-be/src/modules/applications/api/services/interview.service.ts`

Complete interview CRUD:

- `scheduleInterview(applicationId, createDto)` - schedule new interview
- `getInterviewsByApplication(applicationId)` - list all interviews
- `getInterviewById(id)` - get single interview
- `updateInterview(id, updateDto)` - update interview details
- `submitFeedback(id, feedbackDto)` - add interviewer feedback
- `cancelInterview(id, reason)` - cancel interview
- `rescheduleInterview(id, rescheduleDto)` - reschedule interview

## 5. Create Offer Service

**File**: `services/connect-career-be/src/modules/applications/api/services/offer.service.ts`

Complete offer CRUD:

- `createOffer(applicationId, createDto)` - create new offer
- `getOffersByApplication(applicationId)` - list all offers for application
- `getOfferById(id)` - get single offer
- `updateOffer(id, updateDto)` - revise offer
- `recordCandidateResponse(id, responseDto)` - record accept/reject/negotiate
- `cancelOffer(id, reason)` - withdraw offer

## 6. Create Communication Service

**File**: `services/connect-career-be/src/modules/applications/api/services/communication.service.ts`

Communication logging:

- `logCommunication(applicationId, logDto)` - log communication entry
- `getCommunicationLog(applicationId)` - get full communication history
- `updateCommunicationLog(id, updateDto)` - update log entry

## 7. Enhanced Application Service

**File**: `services/connect-career-be/src/modules/applications/api/services/application.service.ts`

Add new methods:

- `getApplicationDetailById(id)` - get full application with all relations (candidate, job, interviews, offers, communications)
- `buildCandidateSnapshot(candidateId)` - build snapshot from User + CandidateProfile
- `updateCandidateSnapshot(applicationId)` - refresh snapshot from current data
- `updateApplicationNotes(applicationId, notes, updatedBy)` - add/update notes
- `flagApplication(applicationId, reason, flaggedBy)` - flag application
- `unflagApplication(applicationId)` - remove flag
- `addTags(applicationId, tags)` - add tags
- `removeTags(applicationId, tags)` - remove tags

## 8. Create Recruiter Controller

**File**: `services/connect-career-be/src/modules/applications/api/controller/application.recruiter.controller.ts`

Complete API endpoints:

### Application Management

- `GET /v1/recruiters/applications/:id` - get full application detail
- `PUT /v1/recruiters/applications/:id/notes` - update notes
- `POST /v1/recruiters/applications/:id/flag` - flag application
- `DELETE /v1/recruiters/applications/:id/flag` - unflag application
- `PUT /v1/recruiters/applications/:id/tags` - manage tags
- `PUT /v1/recruiters/applications/:id/snapshot` - refresh candidate snapshot

### Status Management (Pipeline-based)

- `POST /v1/recruiters/applications/:id/stage/change` - change stage via pipeline
- `GET /v1/recruiters/applications/:id/available-stages` - get next valid stages

### Interview Management

- `POST /v1/recruiters/applications/:id/interviews` - schedule interview
- `GET /v1/recruiters/applications/:id/interviews` - list interviews
- `GET /v1/recruiters/interviews/:interviewId` - get interview detail
- `PUT /v1/recruiters/interviews/:interviewId` - update interview
- `POST /v1/recruiters/interviews/:interviewId/feedback` - submit feedback
- `POST /v1/recruiters/interviews/:interviewId/cancel` - cancel interview
- `POST /v1/recruiters/interviews/:interviewId/reschedule` - reschedule interview

### Offer Management

- `POST /v1/recruiters/applications/:id/offers` - create offer
- `GET /v1/recruiters/applications/:id/offers` - list offers
- `GET /v1/recruiters/offers/:offerId` - get offer detail
- `PUT /v1/recruiters/offers/:offerId` - update/revise offer
- `POST /v1/recruiters/offers/:offerId/response` - record candidate response
- `POST /v1/recruiters/offers/:offerId/cancel` - cancel/withdraw offer

### Communication Management

- `POST /v1/recruiters/applications/:id/communications` - log communication
- `GET /v1/recruiters/applications/:id/communications` - get communication log

## 9. Update Application Module

**File**: `services/connect-career-be/src/modules/applications/applications.module.ts`

Register new entities, services, and controllers:

- Add `Interview`, `Offer` to TypeOrmModule.forFeature
- Add `HiringPipeline`, `PipelineStage`, `PipelineTransition` for pipeline integration
- Register all new services as providers
- Add `ApplicationRecruiterController` to controllers
- Export services for use in other modules

## Key Implementation Details

### Candidate Snapshot Structure

Store at application creation, update on demand:

```typescript
{
  name, email, phone, avatarUrl,
  currentTitle, currentCompany, yearsOfExperience,
  location, skills, education
}
```

### Pipeline-Based Status Flow

1. Get job's active hiring pipeline
2. Find current stage from application status
3. Validate transition exists in pipeline.transitions
4. Map target stage to ApplicationStatus
5. Update application status + add to statusHistory with stage info

### Status History Entry

Include both status and stage information:

```typescript
{
  status: ApplicationStatus,
  changedAt: Date,
  changedBy: string,
  reason?: string,
  notes?: string,
  stageKey?: string,  // from pipeline
  stageName?: string  // from pipeline
}
```

All endpoints include proper validation, error handling, and Swagger documentation.

### To-dos

- [ ] Update Application entity with candidateSnapshot, isFlagged, flagReason, tags, assignedToUserId, customFields
- [ ] Create all DTOs for application detail, interviews, offers, and communications
- [ ] Create ApplicationStatusService for pipeline-based status changes
- [ ] Create InterviewService with complete CRUD operations
- [ ] Create OfferService with complete CRUD operations
- [ ] Create CommunicationService for logging communications
- [ ] Add methods to ApplicationService for detail views, snapshot management, notes, flags, and tags
- [ ] Create ApplicationRecruiterController with all API endpoints
- [ ] Update ApplicationsModule to register all new services and controllers