Use cases and activity diagrams for the reporting system:

## Use Cases

### UC1: User Reports an Entity

- Actor: User
- Precondition: User is authenticated
- Main flow:
  1. User selects entity to report
  2. System shows available report reasons for that entity type
  3. User selects reason and provides details
  4. System validates entity exists
  5. System checks for duplicate pending reports
  6. System creates report with PENDING status
  7. System returns confirmation

### UC2: User Views Their Reports

- Actor: User
- Precondition: User is authenticated
- Main flow:
  1. User requests their reports
  2. System filters reports by reporter ID
  3. System returns paginated list with status

### UC3: Admin Views All Reports

- Actor: Admin
- Precondition: Admin is authenticated and has admin role
- Main flow:
  1. Admin requests reports with optional filters
  2. System returns paginated list
  3. Admin can filter by entity type, status, priority, etc.

### UC4: Admin Updates Report Status

- Actor: Admin
- Precondition: Admin is authenticated and has admin role
- Main flow:
  1. Admin selects a report
  2. Admin updates status (UNDER_REVIEW, RESOLVED, DISMISSED, CLOSED)
  3. If RESOLVED, admin provides resolution details
  4. System updates report and timestamps

### UC5: Admin Assigns Report

- Actor: Admin
- Precondition: Admin is authenticated and has admin role
- Main flow:
  1. Admin selects a report
  2. Admin assigns to another admin
  3. System updates assignedToId and sets status to UNDER_REVIEW

## Activity Diagrams

### 1. User Reporting Flow

```mermaid
flowchart TD
    Start([User wants to report an entity]) --> SelectEntity[Select entity to report]
    SelectEntity --> GetReasons[Get available reasons for entity type]
    GetReasons --> FillForm[Fill report form:<br/>- Reason<br/>- Subject<br/>- Description<br/>- Priority]
    FillForm --> ValidateForm{Form valid?}
    ValidateForm -->|No| ShowError[Show validation errors]
    ShowError --> FillForm
    ValidateForm -->|Yes| CheckEntity{Entity exists?}
    CheckEntity -->|No| EntityNotFound[Return: Entity not found]
    EntityNotFound --> End1([End])
    CheckEntity -->|Yes| CheckDuplicate{Already reported<br/>by this user?}
    CheckDuplicate -->|Yes| DuplicateError[Return: Already reported]
    DuplicateError --> End2([End])
    CheckDuplicate -->|No| CreateReport[Create report with:<br/>- PENDING status<br/>- Store metadata]
    CreateReport --> SaveReport[Save to database]
    SaveReport --> Success[Return: Report created successfully]
    Success --> End3([End])
```

### 2. Admin Handling Report Flow

```mermaid
flowchart TD
    Start([Admin views reports]) --> ViewReports[View all reports with filters]
    ViewReports --> SelectReport[Select a report to handle]
    SelectReport --> ViewDetails[View report details:<br/>- Entity info<br/>- Reporter info<br/>- Description]
    ViewDetails --> Decision{What action?}

    Decision -->|Assign| AssignFlow[Assign to another admin]
    AssignFlow --> UpdateAssigned[Update assignedToId]
    UpdateAssigned --> SetUnderReview[Set status to UNDER_REVIEW]
    SetUnderReview --> Save1[Save changes]
    Save1 --> NotifyAssigned[Notify assigned admin]
    NotifyAssigned --> End1([End])

    Decision -->|Resolve| ResolveFlow[Mark as RESOLVED]
    ResolveFlow --> AddResolution[Add resolution details]
    AddResolution --> SetResolvedAt[Set resolvedAt timestamp]
    SetResolvedAt --> Save2[Save changes]
    Save2 --> End2([End])

    Decision -->|Dismiss| DismissFlow[Mark as DISMISSED]
    DismissFlow --> AddNotes[Add admin notes if needed]
    AddNotes --> Save3[Save changes]
    Save3 --> End3([End])

    Decision -->|Close| CloseFlow[Mark as CLOSED]
    CloseFlow --> Save4[Save changes]
    Save4 --> End4([End])

    Decision -->|Add Notes| NotesFlow[Add admin notes]
    NotesFlow --> Save5[Save changes]
    Save5 --> End5([End])

    Decision -->|Change Priority| PriorityFlow[Update priority level]
    PriorityFlow --> Save6[Save changes]
    Save6 --> End6([End])
```

### 3. Complete Report Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: User creates report

    PENDING --> UNDER_REVIEW: Admin assigns
    PENDING --> RESOLVED: Admin resolves directly
    PENDING --> DISMISSED: Admin dismisses
    PENDING --> CLOSED: Admin closes

    UNDER_REVIEW --> RESOLVED: Admin resolves
    UNDER_REVIEW --> DISMISSED: Admin dismisses
    UNDER_REVIEW --> CLOSED: Admin closes
    UNDER_REVIEW --> PENDING: Reassign or unassign

    RESOLVED --> CLOSED: Admin closes resolved report
    DISMISSED --> CLOSED: Admin closes dismissed report

    CLOSED --> [*]

    note right of PENDING
        Initial state
        Waiting for admin review
    end note

    note right of UNDER_REVIEW
        Assigned to admin
        Being investigated
    end note

    note right of RESOLVED
        Issue resolved
        Resolution details added
    end note

    note right of DISMISSED
        Report dismissed
        No action needed
    end note

    note right of CLOSED
        Final state
        No further actions
    end note
```

### 4. Report Validation Flow

```mermaid
flowchart TD
    Start([Report creation request]) --> ValidateUser{User authenticated?}
    ValidateUser -->|No| AuthError[Return: Unauthorized]
    AuthError --> End1([End])

    ValidateUser -->|Yes| ValidateEntityType{Entity type valid?}
    ValidateEntityType -->|No| EntityTypeError[Return: Invalid entity type]
    EntityTypeError --> End2([End])

    ValidateEntityType -->|Yes| ValidateEntityId{Entity ID format valid?}
    ValidateEntityId -->|No| EntityIdError[Return: Invalid entity ID]
    EntityIdError --> End3([End])

    ValidateEntityId -->|Yes| ValidateReason{Reason matches<br/>entity type?}
    ValidateReason -->|No| ReasonError[Return: Invalid reason]
    ReasonError --> End4([End])

    ValidateReason -->|Yes| CheckEntityExists{Entity exists<br/>in database?}
    CheckEntityExists -->|No| NotFoundError[Return: Entity not found]
    NotFoundError --> End5([End])

    CheckEntityExists -->|Yes| CheckDuplicate{Duplicate pending<br/>report exists?}
    CheckDuplicate -->|Yes| DuplicateError[Return: Already reported]
    DuplicateError --> End6([End])

    CheckDuplicate -->|No| ValidateSubject{Subject length<br/>5-200 chars?}
    ValidateSubject -->|No| SubjectError[Return: Invalid subject]
    SubjectError --> End7([End])

    ValidateSubject -->|Yes| ValidateDescription{Description length<br/>>= 10 chars?}
    ValidateDescription -->|No| DescError[Return: Invalid description]
    DescError --> End8([End])

    ValidateDescription -->|Yes| AllValid[All validations passed]
    AllValid --> CreateReport[Create report]
    CreateReport --> End9([End])
```

### 5. Admin Dashboard Flow

```mermaid
flowchart TD
    Start([Admin opens dashboard]) --> LoadStats[Load report statistics]
    LoadStats --> DisplayStats[Display:<br/>- Total reports<br/>- By status<br/>- By entity type<br/>- By priority]

    DisplayStats --> FilterOptions{Apply filters?}
    FilterOptions -->|Yes| ApplyFilters[Apply filters:<br/>- Entity type<br/>- Status<br/>- Priority<br/>- Date range]
    ApplyFilters --> LoadFiltered[Load filtered reports]
    LoadFiltered --> DisplayReports[Display paginated reports]

    FilterOptions -->|No| LoadAll[Load all reports]
    LoadAll --> DisplayReports

    DisplayReports --> UserAction{User action?}

    UserAction -->|View Details| ViewDetails[Show report details]
    ViewDetails --> HandleReport[Handle report]
    HandleReport --> Refresh[Refresh dashboard]
    Refresh --> DisplayStats

    UserAction -->|Bulk Actions| BulkActions[Select multiple reports]
    BulkActions --> BulkUpdate[Update status/assign]
    BulkUpdate --> Refresh

    UserAction -->|Export| Export[Export reports to CSV/PDF]
    Export --> End1([End])

    UserAction -->|Search| Search[Search by keyword]
    Search --> DisplayReports
```

### 6. Report Reasons Retrieval Flow

```mermaid
flowchart TD
    Start([User selects entity type]) --> RequestReasons[Request reasons for entity type]
    RequestReasons --> CheckType{Entity type valid?}

    CheckType -->|No| InvalidType[Return: Invalid entity type]
    InvalidType --> End1([End])

    CheckType -->|Yes| GetReasons[Get reasons from enum]
    GetReasons --> SwitchType{Entity type?}

    SwitchType -->|USER| UserReasons[Return UserReportReason enum]
    SwitchType -->|ORGANIZATION| OrgReasons[Return OrganizationReportReason enum]
    SwitchType -->|JOB| JobReasons[Return JobReportReason enum]
    SwitchType -->|ORGANIZATION_REVIEW| ReviewReasons[Return ReviewReportReason enum]
    SwitchType -->|RECRUITER_FEEDBACK| FeedbackReasons[Return FeedbackReportReason enum]
    SwitchType -->|APPLICATION| AppReasons[Return ApplicationReportReason enum]
    SwitchType -->|INTERVIEW| InterviewReasons[Return InterviewReportReason enum]
    SwitchType -->|OFFER| OfferReasons[Return OfferReportReason enum]
    SwitchType -->|CV| CVReasons[Return CVReportReason enum]
    SwitchType -->|PAYMENT| PaymentReasons[Return PaymentReportReason enum]
    SwitchType -->|SUBSCRIPTION| SubReasons[Return SubscriptionReportReason enum]
    SwitchType -->|TRANSACTION| TransReasons[Return TransactionReportReason enum]
    SwitchType -->|INVOICE| InvoiceReasons[Return InvoiceReportReason enum]
    SwitchType -->|OTHER| DefaultReasons[Return ['other']]

    UserReasons --> FormatResponse[Format as array of strings]
    OrgReasons --> FormatResponse
    JobReasons --> FormatResponse
    ReviewReasons --> FormatResponse
    FeedbackReasons --> FormatResponse
    AppReasons --> FormatResponse
    InterviewReasons --> FormatResponse
    OfferReasons --> FormatResponse
    CVReasons --> FormatResponse
    PaymentReasons --> FormatResponse
    SubReasons --> FormatResponse
    TransReasons --> FormatResponse
    InvoiceReasons --> FormatResponse
    DefaultReasons --> FormatResponse

    FormatResponse --> ReturnReasons[Return reasons to client]
    ReturnReasons --> End2([End])
```

## Sequence Diagram: Complete Report Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Controller
    participant S as Report Service
    participant DB as Database
    participant A as Admin

    Note over U,DB: User Reporting Flow
    U->>API: POST /v1/reports (CreateReportDto)
    API->>S: createReport(dto, userId)
    S->>S: Validate reason matches entity type
    S->>DB: Check if entity exists
    DB-->>S: Entity found
    S->>DB: Check for duplicate pending report
    DB-->>S: No duplicate found
    S->>DB: Create and save report
    DB-->>S: Report created
    S-->>API: Report object
    API-->>U: 201 Created (ReportResponseDto)

    Note over A,DB: Admin Handling Flow
    A->>API: GET /v1/reports/admin/all?status=pending
    API->>S: getAllReports(query)
    S->>DB: Query reports with filters
    DB-->>S: Reports list
    S-->>API: Paginated reports
    API-->>A: 200 OK (Reports list)

    A->>API: PUT /v1/reports/admin/:id (UpdateReportDto)
    API->>S: updateReport(id, dto, adminId)
    S->>DB: Find report by ID
    DB-->>S: Report found
    S->>S: Update status/notes/assignment
    S->>DB: Save updated report
    DB-->>S: Report updated
    S-->>API: Updated report
    API-->>A: 200 OK (ReportResponseDto)
```

## Use Case Diagram

```mermaid
graph TB
    User[User]
    Admin[Admin]
    System[Reporting System]

    User -->|UC1| ReportEntity[Report Entity]
    User -->|UC2| ViewMyReports[View My Reports]
    User -->|UC7| GetReasons[Get Report Reasons]

    Admin -->|UC3| ViewAllReports[View All Reports]
    Admin -->|UC4| UpdateStatus[Update Report Status]
    Admin -->|UC5| AssignReport[Assign Report]
    Admin -->|UC6| ViewStats[View Statistics]
    Admin -->|UC8| FilterReports[Filter/Search Reports]
    Admin -->|UC9| AddNotes[Add Admin Notes]
    Admin -->|UC10| ResolveReport[Resolve Report]

    ReportEntity --> System
    ViewMyReports --> System
    GetReasons --> System
    ViewAllReports --> System
    UpdateStatus --> System
    AssignReport --> System
    ViewAllReports --> System
    ViewStats --> System
    FilterReports --> System
    AddNotes --> System
    ResolveReport --> System
```

## Summary

The system includes:

1. User reporting with validation
2. Admin workflow with status transitions
3. Report lifecycle states
4. Validation checks
5. Admin dashboard with filtering
6. Dynamic reason retrieval by entity type

These diagrams cover the main flows. Should I adjust any part or add more detail?
