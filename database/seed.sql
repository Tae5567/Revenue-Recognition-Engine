-- Sample contract
INSERT INTO contracts (id, customer_id, customer_name, contract_number, start_date, end_date, total_contract_value, billing_type, status)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'CUST-001',
  'Acme Corporation',
  'CONTRACT-2024-001',
  '2024-01-01',
  '2025-12-31',
  240000.00,
  'subscription',
  'active'
);

-- Performance obligations for this contract
INSERT INTO performance_obligations (id, contract_id, name, pob_type, satisfaction_method, allocated_value, standalone_selling_price, description)
VALUES 
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'SaaS Platform License', 'license', 'over_time', 180000.00, 180000.00, 'Access to software platform over contract term'),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Implementation Services', 'service', 'point_in_time', 30000.00, 35000.00, 'One-time implementation and setup'),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'Support & Maintenance', 'maintenance', 'over_time', 30000.00, 30000.00, 'Ongoing support services');

-- Sample transactions
INSERT INTO transactions (id, contract_id, customer_id, transaction_date, amount, transaction_type, description)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'CUST-001', '2024-01-15', 120000.00, 'invoice', 'Annual payment Year 1'),
  (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'CUST-001', '2025-01-15', 120000.00, 'invoice', 'Annual payment Year 2');