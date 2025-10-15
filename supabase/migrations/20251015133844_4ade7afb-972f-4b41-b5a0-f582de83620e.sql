-- Add admin role for cloudventuresonline@gmail.com
INSERT INTO user_roles (user_id, role)
VALUES ('617b8fd1-17a7-4073-aae3-48a16e460ea0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;