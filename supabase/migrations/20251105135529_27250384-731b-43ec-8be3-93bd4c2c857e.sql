-- Remove admin role from nicoletmein@gmail.com
DELETE FROM user_roles 
WHERE user_id = 'b841fa60-ec2d-4885-ac99-771f79b94d26' 
AND role = 'admin';