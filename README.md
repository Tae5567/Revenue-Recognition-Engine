# Revenue Recognition Automation Engine

Automates ASC 606 / IFRS 15 revenue recognition for B2B SaaS contracts. Takes raw customer contracts and transaction data and produces compliant revenue schedules with a full audit trail — replacing a process that is otherwise done manually in spreadsheets.

## What it does

1. **Parses contracts with AI** — paste or upload a contract; GPT-4o extracts performance obligations, billing type, standalone selling prices, and flags complex scenarios
2. **Runs the ASC 606 five-step model** — automatically determines transaction price, allocates it across performance obligations, and generates a month-by-month recognition schedule
3. **Handles complex scenarios** — usage-based billing with minimums, prorated periods, contract modifications (cumulative catch-up vs. prospective), and multi-POB allocation
4. **Full audit trail** — every recognition entry stores the exact reasoning: which step was applied, what proration was used, and the ASC 606 section reference
5. **What-if modeling** — compare revenue impact of contract changes (extensions, price increases, early termination) before committing
6. **Accounting exports** — download recognition data as CSV (NetSuite-compatible) or QuickBooks IIF journal entries

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Recharts |
| API Layer | Node.js / Express |
| Processing Engine | FastAPI (Python) |
| Database | PostgreSQL |
| Queue | Redis |
| AI | OpenAI GPT-4o |
| Infrastructure | Docker Compose |

## Running locally

```bash
# 1. Start infrastructure
docker-compose up postgres redis -d

# 2. Processing engine (Python)
cd processing-engine
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
uvicorn main:app --reload --port 8000

# 3. API layer (Node)
cd api-layer && npm install && npm run dev   # :4000

# 4. Frontend (Next.js)
cd frontend && npm install && npm run dev   # :3000
```

Or run everything:
```bash
OPENAI_API_KEY=sk-... docker-compose up --build
```

## Testing the pipeline

```bash
# Parse a contract
curl -X POST http://localhost:4000/api/contracts/upload \
  -H "Content-Type: application/json" \
  -d '{"contract_text": "2-year SaaS agreement, $240,000. Platform license $180K over time, implementation $30K at go-live, support $30K over time."}'

# Process transactions for a contract
curl -X POST http://localhost:4000/api/transactions/process/<contract_id>

# Export to CSV
curl http://localhost:4000/api/export/csv/<contract_id> -o revenue.csv
```

## Transaction CSV format

```csv
contract_id,customer_id,transaction_date,amount,usage_quantity,usage_unit,transaction_type,description
<uuid>,CUST-001,2024-01-15,120000,,,invoice,Annual payment Year 1
```

## Project structure

```
revenue-recognition/
├── frontend/          # Next.js dashboard
├── api-layer/         # Node.js REST API
├── processing-engine/ # FastAPI + ASC 606 engine
├── database/          # PostgreSQL schema + seed data
└── docker-compose.yml
```