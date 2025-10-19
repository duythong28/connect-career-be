## Clarify requirements

CV upload/ create sequence diagram

```mermaid
sequenceDiagram
participant U as User
participant API as CV Management API
participant FILE as File Service (Cloudinary)
participant DB as PostgreSQL
participant Q as Kafka Queue
participant P as CV Parser Service
participant ES as Elasticsearch/Vector
participant NOTI as Notification Service
participant AI as AI Service (Resume Analysis)

U->>API: POST /api/v1/cvs/{id}/upload
API->>FILE: Upload CV (via FileManagementService)
FILE->>FILE: Store file (Cloudinary)
FILE-->>API: File metadata + URL
API->>DB: Create CV record + link file
API->>Q: PublishEvent(CVUploadedEvent)
Q->>P: CVUploadedEvent received
P->>FILE: Download file (secure URL)
P->>P: Extract text (PDF/DOCX parsing)
P->>P: OCR if needed (scanned PDFs)
P->>AI: Parse structured data (NER/NLP)
AI-->>P: Structured CV data (JSON)
P->>DB: Store parsed_content (JSON)
P->>ES: Index text + embeddings
P->>Q: PublishEvent(CVParsedEvent)
Q->>NOTI: CVParsedEvent received
NOTI->>U: Notify parsing complete
Q->>API: CVParsedEvent received
API->>U: WebSocket/SSE update
```

## Back of the envelop estimation

## API design

## Data model design

## High level design

## Detailed design

## Identify and discuss bottlenecks
