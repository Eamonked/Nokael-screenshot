-- Initial seed data for Security Incident Reporting System
-- Seed: 001_initial_data.sql

-- Insert default admin user (password: Admin123!)
-- The password hash below is for 'Admin123!' with bcrypt rounds 12
INSERT INTO users (id, username, password_hash, role, is_active) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge',
    'admin',
    true
);

-- Insert sample areas
INSERT INTO areas (id, name, description, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Server Room A', 'Main server room on first floor', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'Network Closet B', 'Network equipment room in basement', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'Security Office', 'Main security monitoring office', true),
    ('550e8400-e29b-41d4-a716-446655440004', 'Data Center', 'Primary data center facility', true),
    ('550e8400-e29b-41d4-a716-446655440005', 'Office Area', 'General office workspace', true);

-- Insert sample customer for license testing
INSERT INTO customers (id, name, email, total_seats, is_active) VALUES (
    '550e8400-e29b-41d4-a716-446655440006',
    'Demo Company Inc.',
    'admin@democompany.com',
    10,
    true
);

-- Insert sample license key for testing
INSERT INTO license_keys (id, license_key, customer_id, max_activations, status) VALUES (
    '550e8400-e29b-41d4-a716-446655440007',
    'DEMO-XXXX-YYYY-ZZZZ-1234',
    '550e8400-e29b-41d4-a716-446655440006',
    5,
    'active'
);

-- Insert sample operator user (password: Operator123!)
INSERT INTO users (id, username, password_hash, role, is_active) VALUES (
    '550e8400-e29b-41d4-a716-446655440008',
    'operator',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge',
    'operator',
    true
);

-- Insert sample viewer user (password: Viewer123!)
INSERT INTO users (id, username, password_hash, role, is_active) VALUES (
    '550e8400-e29b-41d4-a716-446655440009',
    'viewer',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge',
    'viewer',
    true
);

-- Insert sample incidents
INSERT INTO incidents (id, area_id, description, timestamp, operator_id, status) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440001',
        'Unusual network activity detected on server SRV-001. Multiple failed login attempts from external IP addresses.',
        CURRENT_TIMESTAMP - INTERVAL '2 hours',
        '550e8400-e29b-41d4-a716-446655440008',
        'open'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440011',
        '550e8400-e29b-41d4-a716-446655440002',
        'Network switch showing high CPU utilization. Potential DoS attack or network congestion.',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        '550e8400-e29b-41d4-a716-446655440008',
        'in-progress'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440012',
        '550e8400-e29b-41d4-a716-446655440003',
        'Security camera offline. Physical security breach possible.',
        CURRENT_TIMESTAMP - INTERVAL '3 days',
        '550e8400-e29b-41d4-a716-446655440008',
        'closed'
    ); 