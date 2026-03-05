"""
AI-powered contract term parser using OpenAI.
Extracts ASC 606 relevant terms from raw contract text.
"""

import json
from openai import AsyncOpenAI
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert revenue recognition accountant specializing in ASC 606 and IFRS 15.
Analyze contract text and extract structured information needed for automated revenue recognition.

Always respond with valid JSON only (no markdown, no explanation outside the JSON).

Extract:
1. Contract basics (dates, value, parties)
2. All performance obligations (what the company must deliver)
3. Billing type and schedule
4. Variable consideration (usage, bonuses, penalties)
5. Standalone selling prices (SSP) if mentioned
6. Key terms affecting recognition timing

For each performance obligation, determine:
- Whether it's satisfied "over_time" or "point_in_time" per ASC 606-10-25-27
- The appropriate recognition method
"""

EXTRACTION_SCHEMA = {
    "contract_number": "string",
    "customer_name": "string",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD or null",
    "total_contract_value": "number",
    "billing_type": "fixed|usage_based|milestone|subscription|hybrid",
    "auto_renewal": "boolean",
    "performance_obligations": [
        {
            "id": "pob_1",
            "name": "string",
            "pob_type": "license|service|maintenance|usage|implementation",
            "satisfaction_method": "over_time|point_in_time",
            "allocated_value": "number",
            "standalone_selling_price": "number or null",
            "description": "string",
            "recognition_rationale": "string explaining ASC 606 basis"
        }
    ],
    "usage_minimums": {
        "monthly_minimum": "number or null",
        "annual_minimum": "number or null",
        "unit": "string"
    },
    "payment_schedule": [
        {"date": "YYYY-MM-DD", "amount": "number", "description": "string"}
    ],
    "variable_consideration": {
        "type": "string",
        "description": "string",
        "constrained": "boolean"
    },
    "key_risks": ["array of revenue recognition risks"],
    "asc606_notes": "string with recognition guidance"
}


class AIContractParser:

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def parse_contract(self, contract_text: str) -> Dict[str, Any]:
        """
        Parse raw contract text and return structured terms.
        """
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"""Parse this contract for ASC 606 revenue recognition.
Return JSON matching this schema: {json.dumps(EXTRACTION_SCHEMA, indent=2)}

CONTRACT TEXT:
{contract_text}

Return ONLY valid JSON, no other text."""
                    }
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            parsed = json.loads(content)

            # Validate and enrich
            parsed["ai_confidence"] = self._assess_confidence(parsed)
            parsed["flags"] = self._flag_complex_scenarios(parsed)

            return parsed

        except Exception as e:
            logger.error(f"Contract parsing failed: {e}")
            raise

    async def classify_transaction(
        self,
        transaction_description: str,
        contract_terms: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Classify what kind of revenue event this transaction represents.
        """
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an ASC 606 expert. Classify revenue transactions. Respond with JSON only."
                },
                {
                    "role": "user",
                    "content": f"""
Contract context: {json.dumps(contract_terms, indent=2)}

Transaction: {transaction_description}

Classify this transaction:
{{
  "transaction_type": "invoice|usage_event|milestone|renewal|prepayment|adjustment",
  "affects_recognition": true/false,
  "pob_id": "which performance obligation this relates to",
  "recognition_trigger": "what triggers recognition",
  "notes": "any special considerations"
}}"""
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        return json.loads(response.choices[0].message.content)

    def _assess_confidence(self, parsed: Dict) -> str:
        score = 0
        if parsed.get("total_contract_value"):
            score += 20
        if parsed.get("performance_obligations"):
            score += 30
        if parsed.get("start_date"):
            score += 15
        if parsed.get("billing_type"):
            score += 15
        pobs = parsed.get("performance_obligations", [])
        if pobs and all(p.get("satisfaction_method") for p in pobs):
            score += 20
        if score >= 90:
            return "high"
        elif score >= 60:
            return "medium"
        else:
            return "low"

    def _flag_complex_scenarios(self, parsed: Dict) -> List[str]:
        flags = []
        pobs = parsed.get("performance_obligations", [])
        if len(pobs) > 1:
            flags.append("multiple_pobs_require_allocation")
        if parsed.get("variable_consideration"):
            flags.append("variable_consideration_constraint_assessment_needed")
        if parsed.get("usage_minimums", {}).get("monthly_minimum"):
            flags.append("usage_minimums_apply")
        if parsed.get("auto_renewal"):
            flags.append("auto_renewal_contract_modification_risk")
        if any(p.get("pob_type") == "license" for p in pobs):
            flags.append("license_timing_assessment_required")
        return flags