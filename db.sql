


CREATE TABLE roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_role_name CHECK (
        role_name IN ('Student', 'Staff', 'Admin', 'Guest')
    )
);


CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL
        REFERENCES roles(role_id) ON DELETE RESTRICT,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone_number VARCHAR(25),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    profile_image_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT chk_account_status CHECK (
        account_status IN ('active', 'inactive', 'suspended')
    )
);



CREATE TABLE announcements (
    announcement_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    audience VARCHAR(20) NOT NULL DEFAULT 'all',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_announcement_audience CHECK (
        audience IN ('all', 'student', 'staff', 'guest')
    ),

    CONSTRAINT chk_announcement_status CHECK (
        status IN ('draft', 'published', 'archived')
    ),

    CONSTRAINT chk_announcement_dates CHECK (
        expires_at IS NULL OR published_at IS NULL
        OR expires_at >= published_at
    )
);



CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(255),

    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ,

    capacity INTEGER,
    image_url TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    created_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_event_dates CHECK (
        end_date >= start_date
    ),

    CONSTRAINT chk_event_capacity CHECK (
        capacity IS NULL OR capacity > 0
    ),

    CONSTRAINT chk_event_status CHECK (
        status IN ('draft', 'published', 'cancelled', 'completed')
    )
);



CREATE TABLE event_registrations (
    registration_id BIGSERIAL PRIMARY KEY,

    event_id BIGINT NOT NULL
        REFERENCES events(event_id) ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,

    registration_status VARCHAR(20) NOT NULL DEFAULT 'registered',

    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_event_user UNIQUE (event_id, user_id),

    CONSTRAINT chk_registration_status CHECK (
        registration_status IN ('registered', 'cancelled', 'attended')
    )
);



CREATE TABLE clubs (
    club_id BIGSERIAL PRIMARY KEY,
    club_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    contact_email VARCHAR(255),
    image_url TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_club_status CHECK (
        status IN ('active', 'inactive')
    )
);



CREATE TABLE club_memberships (
    membership_id BIGSERIAL PRIMARY KEY,

    club_id BIGINT NOT NULL
        REFERENCES clubs(club_id) ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,

    membership_status VARCHAR(20) NOT NULL DEFAULT 'pending',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_club_user UNIQUE (club_id, user_id),

    CONSTRAINT chk_membership_status CHECK (
        membership_status IN ('pending', 'approved', 'rejected', 'left')
    )
);

-- ============================================================
-- SECTION 8: FACILITIES
-- ============================================================

CREATE TABLE facilities (
    facility_id BIGSERIAL PRIMARY KEY,
    facility_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    building_name VARCHAR(150),
    location_description TEXT,

    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    contact_number VARCHAR(25),
    opening_hours TEXT,
    image_url TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_facility_status CHECK (
        status IN ('active', 'inactive')
    ),

    CONSTRAINT chk_facility_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR
        (latitude BETWEEN -90 AND 90
         AND longitude BETWEEN -180 AND 180)
    )
);

-- ============================================================
-- SECTION 9: EMERGENCY CONTACTS
-- ============================================================

CREATE TABLE emergency_contacts (
    contact_id BIGSERIAL PRIMARY KEY,
    contact_name VARCHAR(150) NOT NULL,
    department VARCHAR(150),
    phone_number VARCHAR(25) NOT NULL,
    email VARCHAR(255),
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SECTION 10: EMERGENCY ALERTS
-- ============================================================

CREATE TABLE emergency_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_alert_severity CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),

    CONSTRAINT chk_alert_status CHECK (
        status IN ('draft', 'active', 'resolved', 'expired')
    ),

    CONSTRAINT chk_alert_dates CHECK (
        expires_at IS NULL OR starts_at IS NULL
        OR expires_at >= starts_at
    )
);

-- ============================================================
-- SECTION 11: SERVICE CATEGORIES
-- ============================================================

CREATE TABLE service_categories (
    category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- SECTION 12: SERVICE REQUESTS
-- ============================================================

CREATE TABLE service_requests (
    request_id BIGSERIAL PRIMARY KEY,

    -- Client-generated UUID for offline synchronization
    client_request_id UUID UNIQUE,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE RESTRICT,

    category_id BIGINT
        REFERENCES service_categories(category_id) ON DELETE SET NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',

    location_description TEXT,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,

    CONSTRAINT chk_request_priority CHECK (
        priority IN ('low', 'normal', 'high', 'urgent')
    ),

    CONSTRAINT chk_request_status CHECK (
        status IN (
            'submitted', 'accepted', 'in_progress',
            'completed', 'rejected', 'cancelled'
        )
    )
);

-- ============================================================
-- SECTION 13: REQUEST ASSIGNMENTS
-- ============================================================

CREATE TABLE request_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,

    request_id BIGINT NOT NULL
        REFERENCES service_requests(request_id) ON DELETE CASCADE,

    staff_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE RESTRICT,

    assigned_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    assignment_status VARCHAR(20) NOT NULL DEFAULT 'active',

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_assignment_status CHECK (
        assignment_status IN ('active', 'completed', 'cancelled')
    )
);

-- ============================================================
-- SECTION 14: REQUEST STATUS HISTORY
-- ============================================================

CREATE TABLE request_status_history (
    history_id BIGSERIAL PRIMARY KEY,

    request_id BIGINT NOT NULL
        REFERENCES service_requests(request_id) ON DELETE CASCADE,

    changed_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,

    comment TEXT,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_history_old_status CHECK (
        old_status IS NULL OR old_status IN (
            'submitted', 'accepted', 'in_progress',
            'completed', 'rejected', 'cancelled'
        )
    ),

    CONSTRAINT chk_history_new_status CHECK (
        new_status IN (
            'submitted', 'accepted', 'in_progress',
            'completed', 'rejected', 'cancelled'
        )
    )
);

-- ============================================================
-- SECTION 15: FEEDBACK
-- ============================================================

CREATE TABLE feedback (
    feedback_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE RESTRICT,

    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    feedback_type VARCHAR(30) NOT NULL DEFAULT 'general',
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',

    admin_response TEXT,

    responded_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_feedback_type CHECK (
        feedback_type IN ('general', 'suggestion', 'complaint', 'other')
    ),

    CONSTRAINT chk_feedback_status CHECK (
        status IN ('submitted', 'under_review', 'responded', 'closed')
    )
);

-- ============================================================
-- SECTION 16: ATTACHMENTS
-- ============================================================

CREATE TABLE attachments (
    attachment_id BIGSERIAL PRIMARY KEY,

    request_id BIGINT
        REFERENCES service_requests(request_id) ON DELETE CASCADE,

    feedback_id BIGINT
        REFERENCES feedback(feedback_id) ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,

    uploaded_by BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_attachment_parent CHECK (
        (request_id IS NOT NULL AND feedback_id IS NULL)
        OR
        (request_id IS NULL AND feedback_id IS NOT NULL)
    ),

    CONSTRAINT chk_attachment_size CHECK (
        file_size IS NULL OR file_size >= 0
    )
);

-- ============================================================
-- SECTION 17: NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    notification_type VARCHAR(50) NOT NULL,

    related_entity_type VARCHAR(50),
    related_entity_id BIGINT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ
);

-- ============================================================
-- SECTION 18: DEVICE TOKENS
-- ============================================================

CREATE TABLE device_tokens (
    device_token_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,

    push_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_device_platform CHECK (
        platform IN ('android', 'ios', 'web')
    )
);

-- ============================================================
-- SECTION 19: AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT
        REFERENCES users(user_id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,

    details JSONB,
    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SECTION 20: REFRESH TOKENS
-- ============================================================

CREATE TABLE refresh_tokens (
    refresh_token_id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SECTION 21: UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 22: AUTOMATIC UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clubs_updated_at
BEFORE UPDATE ON clubs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_emergency_contacts_updated_at
BEFORE UPDATE ON emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_device_tokens_updated_at
BEFORE UPDATE ON device_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SECTION 23: INDEXES
-- ============================================================

CREATE INDEX idx_users_role_id
ON users(role_id);

CREATE INDEX idx_users_account_status
ON users(account_status);

CREATE INDEX idx_announcements_status
ON announcements(status, published_at);

CREATE INDEX idx_announcements_audience
ON announcements(audience);

CREATE INDEX idx_events_start_date
ON events(start_date);

CREATE INDEX idx_event_registrations_user
ON event_registrations(user_id);

CREATE INDEX idx_club_memberships_user
ON club_memberships(user_id);

CREATE INDEX idx_facilities_category
ON facilities(category);

CREATE INDEX idx_emergency_contacts_active
ON emergency_contacts(is_active);

CREATE INDEX idx_emergency_alerts_status
ON emergency_alerts(status, starts_at);

CREATE INDEX idx_service_requests_user
ON service_requests(user_id);

CREATE INDEX idx_service_requests_status
ON service_requests(status);

CREATE INDEX idx_request_assignments_staff
ON request_assignments(staff_id);

CREATE INDEX idx_request_history_request
ON request_status_history(request_id, changed_at);

CREATE INDEX idx_feedback_user
ON feedback(user_id);

CREATE INDEX idx_feedback_status
ON feedback(status);

CREATE INDEX idx_notifications_user_read
ON notifications(user_id, is_read);

CREATE INDEX idx_audit_logs_user
ON audit_logs(user_id, created_at);

CREATE INDEX idx_refresh_tokens_user
ON refresh_tokens(user_id);

-- Optional: only one active staff assignment per request.
-- Remove this index if multiple staff members can be assigned.
CREATE UNIQUE INDEX uq_request_active_assignment
ON request_assignments(request_id)
WHERE assignment_status = 'active';

-- ============================================================
-- SECTION 24: INITIAL ROLE DATA
-- ============================================================

INSERT INTO roles (role_name, description) VALUES
('Student', 'Can access student services and submit requests'),
('Staff', 'Can manage assigned service requests'),
('Admin', 'Can manage and administer the application'),
('Guest', 'Can access public campus information');

-- ============================================================
-- SECTION 25: INITIAL SERVICE CATEGORY DATA
-- ============================================================

INSERT INTO service_categories (category_name, description) VALUES
('Maintenance', 'Building and equipment maintenance'),
('Electricity', 'Electrical problems and repairs'),
('Water', 'Water supply and plumbing problems'),
('Cleaning', 'Campus cleaning and sanitation'),
('IT Support', 'Computer and network support'),
('Other', 'Other campus service requests');

-- ============================================================
-- END OF DATABASE SCRIPT
-- ============================================================
