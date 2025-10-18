```mermaid
stateDiagram-v2
    [*] --> DRAFT
    ACTIVE --> PAUSED: Pause Applications
    ACTIVE --> CLOSED: Close Manually
    ACTIVE --> EXPIRED: Auto-expires
    PAUSED --> ACTIVE: Resume Applications
    PAUSED --> CLOSED

    CLOSED --> ACTIVE: Re-open Job
    EXPIRED --> ACTIVE: Re-activate Job

    CLOSED --> ARCHIVED: Archive
    EXPIRED --> ARCHIVED: Archive
    ARCHIVED --> ACTIVE: Un-archive

    ACTIVE --> CANCELLED: Cancel Live Job
    PAUSED --> CANCELLED
    PENDING_APPROVAL --> CANCELLED: Reject & Cancel

    CANCELLED --> [*]
```

Auto-transitions: Your model mentions EXPIRED, which is a great automated transition. You could also implement other triggers. For instance, when an Application status becomes HIRED, automatically transition the associated Job status to FILLED.
