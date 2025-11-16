Reviewing the existing documentation, then providing ERD, sequence diagrams, and architecture diagrams:

[2 tools called]

Adding ERD, sequence diagrams, and architecture diagrams to the documentation:

````markdown:services/connect-career-be/docs/report.flow.md
# Report System Documentation

## Table of Contents
1. [ERD - Entity Relationship Diagram](#erd)
2. [Sequence Diagrams](#sequence-diagrams)
3. [Architecture Diagrams](#architecture-diagrams)
4. [Use Cases](#use-cases)
5. [Activity Diagrams](#activity-diagrams)

---

## ERD - Entity Relationship Diagram

### Complete Database Schema

```mermaid
erDiagram
    User ||--o{ Report : "reports"
    User ||--o{ Report : "assigned_to"
    Report }o--|| ReportableEntity : "references"

    User {
        uuid id PK
        string email
        string fullName
        enum status
        timestamp createdAt
    }

    Report {
        uuid id PK
        uuid reporterId FK
        uuid assignedToId FK
        enum entityType
        uuid entityId
        string subject
        text description
        string reason
        enum status
        enum priority
        text adminNotes
        text resolution
        timestamp resolvedAt
        jsonb metadata
        timestamp createdAt
        timestamp updatedAt
    }

    Organization {
        uuid id PK
        uuid userId FK
        string name
        enum organizationType
    }

    Job {
        uuid id PK
        uuid organizationId FK
        uuid userId FK
        string title
        enum status
    }

    OrganizationReview {
        uuid id PK
        uuid organizationId FK
        uuid candidateId FK
        int overallRating
    }

    RecruiterFeedback {
        uuid id PK
        uuid recruiterUserId FK
        uuid candidateId FK
        text feedback
    }

    Application {
        uuid id PK
        uuid jobId FK
        uuid candidateId FK
        enum status
    }

    Interview {
        uuid id PK
        uuid applicationId FK
        enum status
    }

    Offer {
        uuid id PK
        uuid applicationId FK
        enum status
    }

    CV {
        uuid id PK
        uuid userId FK
        string fileName
    }

    Report ||--o{ User : "reporter"
    Report ||--o{ User : "assigned_admin"
    Report }o--|| Organization : "can_report"
    Report }o--|| Job : "can_report"
    Report }o--|| OrganizationReview : "can_report"
    Report }o--|| RecruiterFeedback : "can_report"
    Report }o--|| Application : "can_report"
    Report }o--|| Interview : "can_report"
    Report }o--|| Offer : "can_report"
    Report }o--|| CV : "can_report"
````

### Report Entity Detailed Structure

```mermaid
erDiagram
    Report {
        uuid id PK "Primary Key"
        uuid reporterId FK "Foreign Key to User"
        uuid assignedToId FK "Foreign Key to User (Admin)"
        enum entityType "USER, ORGANIZATION, JOB, etc."
        uuid entityId "ID of reported entity"
        varchar subject "Report subject (5-200 chars)"
        text description "Report description (min 10 chars)"
        varchar reason "Report reason code"
        enum status "PENDING, UNDER_REVIEW, RESOLVED, DISMISSED, CLOSED"
        enum priority "LOW, MEDIUM, HIGH, URGENT"
        text adminNotes "Internal admin notes"
        text resolution "Resolution details"
        timestamptz resolvedAt "When resolved"
        jsonb metadata "Additional context data"
        timestamptz createdAt "Creation timestamp"
        timestamptz updatedAt "Last update timestamp"
    }

    User {
        uuid id PK
        string email
        string fullName
    }

    Report ||--|| User : "reporter"
    Report ||--o| User : "assigned_admin"
```

---

## Sequence Diagrams

### 1. User Creates Report - Complete Flow

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant API as Report Controller
    participant Guard as JWT Auth Guard
    participant Service as Report Service
    participant DB as PostgreSQL Database
    participant Validator as Validation Layer

    Client->>API: POST /v1/reports<br/>{entityType, entityId, reason, subject, description}
    API->>Guard: Validate JWT Token
    Guard-->>API: User authenticated (userId)

    API->>Validator: Validate DTO
    Validator->>Validator: Check required fields
    Validator->>Validator: Validate field lengths
    Validator-->>API: Validation passed

    API->>Service: createReport(dto, userId)
    Service->>Service: getReasonsForEntityType(entityType)
    Service->>Service: Validate reason matches entity type

    alt Invalid reason
        Service-->>API: BadRequestException
        API-->>Client: 400 Bad Request
    else Valid reason
        Service->>DB: SELECT * FROM reports<br/>WHERE reporterId = ?<br/>AND entityType = ?<br/>AND entityId = ?<br/>AND status = 'PENDING'
        DB-->>Service: Existing report or null

        alt Duplicate report exists
            Service-->>API: BadRequestException("Already reported")
            API-->>Client: 400 Bad Request
        else No duplicate
            Service->>DB: INSERT INTO reports<br/>(id, reporterId, entityType, entityId,<br/>subject, description, reason, status, priority,<br/>createdAt, updatedAt)
            DB-->>Service: Report created
            Service-->>API: Report entity
            API-->>Client: 201 Created<br/>{id, status, createdAt, ...}
        end
    end
```

### 2. User Views Their Reports

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant API as Report Controller
    participant Guard as JWT Auth Guard
    participant Service as Report Service
    participant DB as PostgreSQL Database

    Client->>API: GET /v1/reports/my-reports?page=1&limit=20&status=pending
    API->>Guard: Validate JWT Token
    Guard-->>API: User authenticated (userId)

    API->>Service: getMyReports(userId, query)
    Service->>DB: SELECT report.*, reporter.*<br/>FROM reports report<br/>LEFT JOIN users reporter<br/>ON report.reporterId = reporter.id<br/>WHERE report.reporterId = ?<br/>AND report.status = ?<br/>ORDER BY report.createdAt DESC<br/>LIMIT ? OFFSET ?

    DB-->>Service: Reports array + total count
    Service->>Service: Calculate pagination (totalPages)
    Service-->>API: {data: Report[], total, page, limit, totalPages}
    API-->>Client: 200 OK<br/>{data, pagination}
```

### 3. Admin Views All Reports with Filters

```mermaid
sequenceDiagram
    participant Admin as Admin Client
    participant API as Report Controller
    participant Guard as JWT Auth Guard
    participant RoleGuard as Roles Guard
    participant Service as Report Service
    participant DB as PostgreSQL Database

    Admin->>API: GET /v1/reports/admin/all?<br/>entityType=JOB&status=PENDING&priority=HIGH
    API->>Guard: Validate JWT Token
    Guard-->>API: User authenticated

    API->>RoleGuard: Check roles (super_admin, admin)
    RoleGuard->>RoleGuard: Verify user has admin role
    RoleGuard-->>API: Authorized

    API->>Service: getAllReports(query)
    Service->>DB: SELECT report.*, reporter.*, assigned.*<br/>FROM reports report<br/>LEFT JOIN users reporter<br/>ON report.reporterId = reporter.id<br/>LEFT JOIN users assigned<br/>ON report.assignedToId = assigned.id<br/>WHERE report.entityType = ?<br/>AND report.status = ?<br/>AND report.priority = ?<br/>ORDER BY report.createdAt DESC<br/>LIMIT ? OFFSET ?

    DB-->>Service: Reports array + total count
    Service-->>API: Paginated reports
    API-->>Admin: 200 OK<br/>{data, pagination}
```

### 4. Admin Updates Report Status

```mermaid
sequenceDiagram
    participant Admin as Admin Client
    participant API as Report Controller
    participant Guard as JWT Auth Guard
    participant RoleGuard as Roles Guard
    participant Service as Report Service
    participant DB as PostgreSQL Database

    Admin->>API: PUT /v1/reports/admin/:id<br/>{status: "RESOLVED", resolution: "Issue fixed"}
    API->>Guard: Validate JWT Token
    Guard-->>API: User authenticated (adminId)

    API->>RoleGuard: Check admin role
    RoleGuard-->>API: Authorized

    API->>Service: updateReport(reportId, dto, adminId)
    Service->>DB: SELECT * FROM reports<br/>WHERE id = ?<br/>LEFT JOIN users reporter<br/>LEFT JOIN users assignedTo
    DB-->>Service: Report found

    Service->>Service: Update report fields:<br/>- status = RESOLVED<br/>- resolution = "Issue fixed"<br/>- resolvedAt = NOW()

    Service->>DB: UPDATE reports<br/>SET status = ?, resolution = ?,<br/>resolvedAt = ?, updatedAt = NOW()<br/>WHERE id = ?
    DB-->>Service: Report updated

    Service-->>API: Updated report entity
    API-->>Admin: 200 OK<br/>{id, status, resolution, resolvedAt, ...}
```

### 5. Get Report Reasons by Entity Type

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant API as Report Controller
    participant Guard as JWT Auth Guard
    participant Service as Report Service

    Client->>API: GET /v1/reports/reasons/JOB
    API->>Guard: Validate JWT Token
    Guard-->>API: User authenticated

    API->>Service: getReasonsForEntityType(ReportableEntityType.JOB)
    Service->>Service: getReasonsForEntityType(entityType)

    alt Entity Type = JOB
        Service->>Service: Return Object.values(JobReportReason)
        Service-->>API: ["fake_job", "scam", "misleading_description", ...]
    else Entity Type = USER
        Service->>Service: Return Object.values(UserReportReason)
        Service-->>API: ["inappropriate_behavior", "spam", "fake_account", ...]
    else Other types...
        Service-->>API: Corresponding reasons array
    end

    API-->>Client: 200 OK<br/>{entityType: "JOB", reasons: [...]}
```

### 6. Complete Report Lifecycle - Admin Workflow

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant API as API
    participant Service as Report Service
    participant DB as Database
    participant Notify as Notification Service

    Note over Admin,DB: Report Lifecycle Management

    Admin->>API: GET /v1/reports/admin/all?status=PENDING
    API->>Service: getAllReports(query)
    Service->>DB: Query pending reports
    DB-->>Service: Reports list
    Service-->>API: Paginated reports
    API-->>Admin: Display reports

    Admin->>API: PUT /v1/reports/admin/:id<br/>{assignedToId: "admin-uuid"}
    API->>Service: updateReport(id, {assignedToId}, adminId)
    Service->>DB: Update report: assignedToId, status=UNDER_REVIEW
    DB-->>Service: Updated
    Service->>Notify: Notify assigned admin
    Service-->>API: Report updated
    API-->>Admin: 200 OK

    Note over Admin,DB: Admin investigates...

    Admin->>API: PUT /v1/reports/admin/:id<br/>{status: "RESOLVED", resolution: "Fixed"}
    API->>Service: updateReport(id, {status, resolution}, adminId)
    Service->>DB: Update: status=RESOLVED, resolvedAt=NOW()
    DB-->>Service: Updated
    Service-->>API: Report resolved
    API-->>Admin: 200 OK

    Admin->>API: PUT /v1/reports/admin/:id<br/>{status: "CLOSED"}
    API->>Service: updateReport(id, {status: "CLOSED"}, adminId)
    Service->>DB: Update: status=CLOSED
    DB-->>Service: Updated
    Service-->>API: Report closed
    API-->>Admin: 200 OK
```

---

## Architecture Diagrams

### 1. System Architecture - High Level

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Application]
        Mobile[Mobile App]
    end

    subgraph "API Gateway / Load Balancer"
        LB[Load Balancer]
    end

    subgraph "Application Layer"
        subgraph "NestJS Application"
            Auth[Authentication Module]
            Reports[Reports Module]
            Backoffice[Backoffice Module]
            Other[Other Modules]
        end
    end

    subgraph "Business Logic Layer"
        ReportService[Report Service]
        ReportController[Report Controller]
        Guards[Auth Guards]
        Validators[DTO Validators]
    end

    subgraph "Data Access Layer"
        TypeORM[TypeORM]
        Repositories[Repositories]
    end

    subgraph "Database Layer"
        PostgreSQL[(PostgreSQL Database)]
    end

    subgraph "External Services"
        Email[Email Service]
        Notifications[Notification Service]
    end

    Web --> LB
    Mobile --> LB
    LB --> Auth
    LB --> Reports
    LB --> Backoffice
    LB --> Other

    Reports --> ReportController
    ReportController --> Guards
    ReportController --> Validators
    ReportController --> ReportService

    ReportService --> TypeORM
    TypeORM --> Repositories
    Repositories --> PostgreSQL

    ReportService --> Email
    ReportService --> Notifications
```

### 2. Module Architecture - Reports Module

```mermaid
graph TB
    subgraph "Reports Module"
        subgraph "API Layer"
            Controller[Report Controller]
            DTOs[DTOs:<br/>CreateReportDto<br/>UpdateReportDto<br/>ReportListQueryDto<br/>ReportResponseDto]
        end

        subgraph "Service Layer"
            Service[Report Service]
            Helpers[Helper Functions:<br/>getReasonsForEntityType]
        end

        subgraph "Domain Layer"
            Entity[Report Entity]
            Enums[Enums:<br/>ReportableEntityType<br/>ReportStatus<br/>ReportPriority<br/>ReportReason Enums]
        end

        subgraph "Infrastructure Layer"
            Repository[TypeORM Repository]
        end
    end

    subgraph "External Dependencies"
        Identity[Identity Module<br/>User Entity]
        Jobs[Jobs Module<br/>Job Entity]
        Profile[Profile Module<br/>Organization Entity]
        Applications[Applications Module<br/>Application Entity]
    end

    Controller --> DTOs
    Controller --> Service
    Service --> Helpers
    Service --> Entity
    Service --> Repository
    Repository --> PostgreSQL[(PostgreSQL)]

    Service -.-> Identity
    Service -.-> Jobs
    Service -.-> Profile
    Service -.-> Applications
```

### 3. Component Diagram - Detailed

```mermaid
graph LR
    subgraph "Report Controller"
        CreateEP[POST /v1/reports]
        GetReasonsEP[GET /v1/reports/reasons/:type]
        MyReportsEP[GET /v1/reports/my-reports]
        MyReportEP[GET /v1/reports/my-reports/:id]
        AdminAllEP[GET /v1/reports/admin/all]
        AdminReportEP[GET /v1/reports/admin/:id]
        AdminUpdateEP[PUT /v1/reports/admin/:id]
    end

    subgraph "Report Service"
        CreateService[createReport]
        GetMyReportsService[getMyReports]
        GetReportByIdService[getReportById]
        GetAllReportsService[getAllReports]
        UpdateReportService[updateReport]
        GetReasonsService[getReasonsForEntityType]
    end

    subgraph "Guards & Validators"
        JWTGuard[JWT Auth Guard]
        RolesGuard[Roles Guard]
        DTOValidator[DTO Validator]
    end

    subgraph "Database"
        ReportRepo[Report Repository]
        UserRepo[User Repository]
    end

    CreateEP --> JWTGuard
    CreateEP --> DTOValidator
    CreateEP --> CreateService

    GetReasonsEP --> JWTGuard
    GetReasonsEP --> GetReasonsService

    MyReportsEP --> JWTGuard
    MyReportsEP --> GetMyReportsService

    MyReportEP --> JWTGuard
    MyReportEP --> GetReportByIdService

    AdminAllEP --> JWTGuard
    AdminAllEP --> RolesGuard
    AdminAllEP --> GetAllReportsService

    AdminReportEP --> JWTGuard
    AdminReportEP --> RolesGuard
    AdminReportEP --> GetReportByIdService

    AdminUpdateEP --> JWTGuard
    AdminUpdateEP --> RolesGuard
    AdminUpdateEP --> DTOValidator
    AdminUpdateEP --> UpdateReportService

    CreateService --> ReportRepo
    GetMyReportsService --> ReportRepo
    GetAllReportsService --> ReportRepo
    UpdateReportService --> ReportRepo
    UpdateReportService --> UserRepo
    GetReportByIdService --> ReportRepo
```

### 4. Data Flow Diagram

```mermaid
flowchart TD
    Start([User Action]) --> Input{Action Type}

    Input -->|Create Report| CreateFlow[Create Report Flow]
    Input -->|View Reports| ViewFlow[View Reports Flow]
    Input -->|Update Report| UpdateFlow[Update Report Flow]

    CreateFlow --> Validate1[Validate Input]
    Validate1 --> CheckDuplicate[Check Duplicate]
    CheckDuplicate --> SaveReport[Save to Database]
    SaveReport --> Response1[Return Report]

    ViewFlow --> AuthCheck1[Authentication Check]
    AuthCheck1 --> QueryDB[Query Database]
    QueryDB --> Filter[Apply Filters]
    Filter --> Paginate[Paginate Results]
    Paginate --> Response2[Return Reports]

    UpdateFlow --> AuthCheck2[Authentication Check]
    AuthCheck2 --> RoleCheck[Role Check Admin]
    RoleCheck --> Validate2[Validate Update Data]
    Validate2 --> UpdateDB[Update Database]
    UpdateDB --> Response3[Return Updated Report]

    Response1 --> End([End])
    Response2 --> End
    Response3 --> End
```

### 5. Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Frontend"
            WebApp[Web Application]
            MobileApp[Mobile App]
        end

        subgraph "API Layer"
            API1[API Server 1]
            API2[API Server 2]
            API3[API Server N]
        end

        subgraph "Database"
            PrimaryDB[(PostgreSQL Primary)]
            ReplicaDB[(PostgreSQL Replica)]
        end

        subgraph "Cache Layer"
            Redis[(Redis Cache)]
        end

        subgraph "Message Queue"
            Queue[Message Queue<br/>RabbitMQ/Kafka]
        end
    end

    WebApp --> API1
    WebApp --> API2
    MobileApp --> API1
    MobileApp --> API2

    API1 --> PrimaryDB
    API2 --> PrimaryDB
    API3 --> PrimaryDB

    API1 --> ReplicaDB
    API2 --> ReplicaDB

    API1 --> Redis
    API2 --> Redis

    API1 --> Queue
    API2 --> Queue
```

### 6. Security Architecture

```mermaid
graph TB
    Request[Incoming Request] --> LB[Load Balancer]
    LB --> WAF[Web Application Firewall]
    WAF --> RateLimit[Rate Limiting]
    RateLimit --> JWT[JWT Validation]
    JWT --> Auth[Authentication Service]
    Auth --> Authorize[Authorization Check]
    Authorize --> RBAC[Role-Based Access Control]
    RBAC --> API[API Endpoint]
    API --> Service[Business Logic]
    Service --> DB[(Database)]

    subgraph "Security Layers"
        WAF
        RateLimit
        JWT
        Auth
        Authorize
        RBAC
    end
```

---

## Database Indexes Strategy

```mermaid
graph LR
    subgraph "Report Table Indexes"
        PK[Primary Key: id]
        IDX1[Index: reporterId]
        IDX2[Index: entityType, entityId]
        IDX3[Index: status]
        IDX4[Index: priority]
        IDX5[Index: createdAt]
        IDX6[Index: assignedToId]
        IDX7[Composite: reporterId, status, createdAt]
        IDX8[Composite: entityType, status]
    end

    PK --> FastLookup[Fast ID Lookup]
    IDX1 --> UserReports[Fast User Reports Query]
    IDX2 --> EntityReports[Fast Entity Reports Query]
    IDX3 --> StatusFilter[Fast Status Filtering]
    IDX4 --> PriorityFilter[Fast Priority Filtering]
    IDX5 --> DateSort[Fast Date Sorting]
    IDX6 --> AssignedFilter[Fast Assigned Reports]
    IDX7 --> UserStatusQuery[Optimized User Status Query]
    IDX8 --> EntityStatusQuery[Optimized Entity Status Query]
```

---

## API Endpoints Summary

### User Endpoints

- `POST /v1/reports` - Create report
- `GET /v1/reports/reasons/:entityType` - Get reasons
- `GET /v1/reports/my-reports` - List user's reports
- `GET /v1/reports/my-reports/:id` - Get user's report by ID

### Admin Endpoints

- `GET /v1/reports/admin/all` - List all reports (with filters)
- `GET /v1/reports/admin/:id` - Get report by ID
- `PUT /v1/reports/admin/:id` - Update report

---

## Summary

This documentation provides:

1. ✅ **ERD** - Complete database schema and relationships
2. ✅ **Sequence Diagrams** - Detailed interaction flows
3. ✅ **Architecture Diagrams** - System, module, component, and deployment views
4. ✅ **Data Flow** - How data moves through the system
5. ✅ **Security Architecture** - Security layers and controls
6. ✅ **Database Strategy** - Indexing for performance

All diagrams are in Mermaid format and can be rendered in Markdown viewers or documentation tools.

```

This documentation includes:
1. ERD — database relationships
2. Sequence diagrams — 6 detailed flows
3. Architecture diagrams — system, module, component, deployment, security
4. Data flow — request processing
5. Database strategy — indexing

All diagrams are in Mermaid format and ready to use. Should I add more specific diagrams or details?
```
