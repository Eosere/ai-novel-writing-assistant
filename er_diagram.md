# Supabase ER Diagram
erDiagram
    users {
        uuid id PK
        varchar numeric_id UK
        text password_hash
        timestamp created_at
        timestamp last_login
    }

    writings {
        uuid id PK
        uuid user_id FK
        varchar title
        text content
        integer word_count
        timestamp created_at
        timestamp updated_at
        timestamp auto_saved_at
    }

    foreshadowings {
        uuid id PK
        uuid user_id FK
        uuid writing_id FK
        varchar clue_title
        text content
        varchar planted_at_position
        boolean is_resolved
        varchar resolved_at_position
        timestamp created_at
        timestamp updated_at
    }

    writing_logs {
        uuid id PK
        uuid user_id FK
        uuid writing_id FK
        varchar action_type
        text details
        timestamp created_at
    }

    users ||--o{ writings : "creates"
    users ||--o{ foreshadowings : "manages"
    users ||--o{ writing_logs : "records"
    writings ||--o{ foreshadowings : "contains"
    writings ||--o{ writing_logs : "triggers"
