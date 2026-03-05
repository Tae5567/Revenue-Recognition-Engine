-- Contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(500),
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  total_contract_value DECIMAL(15,2) NOT NULL,
  billing_type VARCHAR(50) NOT NULL, -- 'fixed', 'usage_based', 'milestone', 'subscription'
  payment_terms JSONB,               -- raw terms from AI parsing
  performance_obligations JSONB,     -- ASC 606 POBs
  standalone_selling_prices JSONB,
  status VARCHAR(50) DEFAULT 'active',
  raw_contract_text TEXT,
  ai_parsed_terms JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions / Usage Events
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  customer_id VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  usage_quantity DECIMAL(15,4),
  usage_unit VARCHAR(100),
  transaction_type VARCHAR(100), -- 'invoice', 'usage_event', 'milestone', 'renewal'
  description TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue Recognition Ledger (the core output)
CREATE TABLE recognition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id),
  contract_id UUID REFERENCES contracts(id),
  performance_obligation_id VARCHAR(255),
  recognition_date DATE NOT NULL,
  recognized_amount DECIMAL(15,2) NOT NULL,
  deferred_amount DECIMAL(15,2) DEFAULT 0,
  recognition_method VARCHAR(100), -- 'over_time', 'point_in_time', 'usage_based', 'prorated'
  period_start DATE,
  period_end DATE,
  accounting_period VARCHAR(7),    -- 'YYYY-MM'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'recognized', 'reversed', 'adjusted'
  audit_trail JSONB,               -- full logic explanation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Obligations
CREATE TABLE performance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  pob_type VARCHAR(100),           -- 'license', 'service', 'maintenance', 'usage'
  satisfaction_method VARCHAR(50), -- 'over_time', 'point_in_time'
  allocated_value DECIMAL(15,2),
  standalone_selling_price DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  is_satisfied BOOLEAN DEFAULT FALSE,
  satisfied_date DATE
);

-- Contract Modifications
CREATE TABLE contract_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  modification_date DATE NOT NULL,
  modification_type VARCHAR(100), -- 'scope_increase', 'price_change', 'termination', 'extension'
  previous_terms JSONB,
  new_terms JSONB,
  cumulative_catch_up DECIMAL(15,2),
  prospective_adjustment DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing Jobs
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100),  -- 'process_transactions', 'parse_contract', 'generate_schedule'
  status VARCHAR(50) DEFAULT 'queued',
  input_data JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100),
  entity_id UUID,
  action VARCHAR(100),
  details JSONB,
  performed_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recognition_period ON recognition_entries(accounting_period);
CREATE INDEX idx_recognition_contract ON recognition_entries(contract_id);
CREATE INDEX idx_transactions_contract ON transactions(contract_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);