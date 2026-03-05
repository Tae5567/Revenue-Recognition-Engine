from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date
from decimal import Decimal
from enum import Enum

class BillingType(str, Enum):
    FIXED = "fixed"
    USAGE_BASED = "usage_based"
    MILESTONE = "milestone"
    SUBSCRIPTION = "subscription"
    HYBRID = "hybrid"

class RecognitionMethod(str, Enum):
    OVER_TIME = "over_time"
    POINT_IN_TIME = "point_in_time"
    USAGE_BASED = "usage_based"
    PRORATED = "prorated"
    MILESTONE = "milestone"

class PerformanceObligation(BaseModel):
    id: str
    name: str
    pob_type: str  # 'license', 'service', 'maintenance', 'usage'
    satisfaction_method: str  # 'over_time', 'point_in_time'
    allocated_value: Decimal
    standalone_selling_price: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None

class ContractTerms(BaseModel):
    contract_id: str
    customer_name: str
    contract_number: str
    start_date: date
    end_date: Optional[date]
    total_contract_value: Decimal
    billing_type: BillingType
    performance_obligations: List[PerformanceObligation]
    payment_schedule: Optional[List[Dict[str, Any]]] = None
    usage_minimums: Optional[Dict[str, Any]] = None
    cancellation_terms: Optional[str] = None
    auto_renewal: bool = False

class Transaction(BaseModel):
    id: str
    contract_id: str
    customer_id: str
    transaction_date: date
    amount: Decimal
    usage_quantity: Optional[Decimal] = None
    usage_unit: Optional[str] = None
    transaction_type: str
    description: Optional[str] = None

class RecognitionEntry(BaseModel):
    transaction_id: str
    contract_id: str
    performance_obligation_id: Optional[str]
    recognition_date: date
    recognized_amount: Decimal
    deferred_amount: Decimal
    recognition_method: RecognitionMethod
    period_start: Optional[date]
    period_end: Optional[date]
    accounting_period: str  # YYYY-MM
    audit_trail: Dict[str, Any]