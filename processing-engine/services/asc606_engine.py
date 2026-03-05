"""
ASC 606 / IFRS 15 Revenue Recognition Engine

The 5-step model:
1. Identify the contract with the customer
2. Identify the performance obligations
3. Determine the transaction price
4. Allocate the transaction price to POBs
5. Recognize revenue when/as POBs are satisfied
"""

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional, Tuple
from dateutil.relativedelta import relativedelta
import logging

from models.contract import (
    ContractTerms, Transaction, RecognitionEntry,
    PerformanceObligation, RecognitionMethod
)

logger = logging.getLogger(__name__)


class ASC606Engine:
    """Core revenue recognition engine implementing ASC 606 / IFRS 15"""

    def __init__(self):
        self.recognition_entries: List[RecognitionEntry] = []

    def process_transaction(
        self,
        transaction: Transaction,
        contract: ContractTerms,
        existing_entries: Optional[List[RecognitionEntry]] = None
    ) -> List[RecognitionEntry]:
        """
        Main entry point. Returns recognition entries for a transaction.
        """
        entries = []
        audit_base = {
            "transaction_id": transaction.id,
            "contract_id": transaction.contract_id,
            "contract_number": contract.contract_number,
            "billing_type": contract.billing_type,
            "steps_applied": []
        }

        # Step 1-2: Identify contract & POBs (already done via contract terms)
        audit_base["steps_applied"].append({
            "step": 1,
            "description": "Contract identified",
            "contract_number": contract.contract_number,
            "customer": contract.customer_name
        })

        # Step 3: Determine transaction price
        transaction_price = self._determine_transaction_price(
            transaction, contract, audit_base
        )

        # Step 4: Allocate to performance obligations
        allocations = self._allocate_to_pobs(
            transaction_price, contract.performance_obligations, audit_base
        )

        # Step 5: Recognize revenue
        for pob, allocated_amount in allocations:
            pob_entries = self._recognize_revenue(
                transaction, contract, pob, allocated_amount, audit_base.copy()
            )
            entries.extend(pob_entries)

        return entries

    def _determine_transaction_price(
        self,
        transaction: Transaction,
        contract: ContractTerms,
        audit: Dict
    ) -> Decimal:
        """
        Step 3: Determine transaction price.
        Handles variable consideration, constraints, significant financing.
        """
        price = transaction.amount

        # Handle usage-based with minimums
        if contract.billing_type == "usage_based" and contract.usage_minimums:
            min_amount = Decimal(str(contract.usage_minimums.get("monthly_minimum", 0)))
            if price < min_amount:
                audit["steps_applied"].append({
                    "step": 3,
                    "description": "Minimum billing applied",
                    "original_amount": float(price),
                    "minimum_amount": float(min_amount),
                    "price_used": float(min_amount)
                })
                price = min_amount
            else:
                audit["steps_applied"].append({
                    "step": 3,
                    "description": "Usage-based billing",
                    "usage_quantity": float(transaction.usage_quantity or 0),
                    "usage_unit": transaction.usage_unit,
                    "price": float(price)
                })
        else:
            audit["steps_applied"].append({
                "step": 3,
                "description": "Fixed transaction price",
                "price": float(price)
            })

        return price

    def _allocate_to_pobs(
        self,
        transaction_price: Decimal,
        pobs: List[PerformanceObligation],
        audit: Dict
    ) -> List[Tuple[PerformanceObligation, Decimal]]:
        """
        Step 4: Allocate transaction price to performance obligations
        using relative standalone selling prices (SSP).
        """
        if not pobs:
            return []

        total_ssp = sum(
            pob.standalone_selling_price or pob.allocated_value
            for pob in pobs
        )

        allocations = []
        allocation_details = []

        for i, pob in enumerate(pobs):
            ssp = pob.standalone_selling_price or pob.allocated_value
            if total_ssp > 0:
                ratio = ssp / total_ssp
                allocated = (transaction_price * ratio).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
            else:
                allocated = transaction_price / len(pobs)

            allocations.append((pob, allocated))
            allocation_details.append({
                "pob_id": pob.id,
                "pob_name": pob.name,
                "ssp": float(ssp),
                "ratio": float(ratio if total_ssp > 0 else 1 / len(pobs)),
                "allocated_amount": float(allocated)
            })

        audit["steps_applied"].append({
            "step": 4,
            "description": "Transaction price allocated by relative SSP",
            "total_transaction_price": float(transaction_price),
            "total_ssp": float(total_ssp),
            "allocations": allocation_details
        })

        return allocations

    def _recognize_revenue(
        self,
        transaction: Transaction,
        contract: ContractTerms,
        pob: PerformanceObligation,
        amount: Decimal,
        audit: Dict
    ) -> List[RecognitionEntry]:
        """
        Step 5: Recognize revenue when/as each POB is satisfied.
        """
        entries = []

        if pob.satisfaction_method == "point_in_time":
            entries.extend(
                self._recognize_point_in_time(transaction, contract, pob, amount, audit)
            )
        elif pob.satisfaction_method == "over_time":
            entries.extend(
                self._recognize_over_time(transaction, contract, pob, amount, audit)
            )

        return entries

    def _recognize_point_in_time(
        self,
        transaction: Transaction,
        contract: ContractTerms,
        pob: PerformanceObligation,
        amount: Decimal,
        audit: Dict
    ) -> List[RecognitionEntry]:
        """
        Recognize all revenue at a single point (e.g., license delivery,
        milestone completion).
        """
        recognition_date = pob.satisfied_date if hasattr(pob, 'satisfied_date') and pob.satisfied_date \
            else transaction.transaction_date

        audit["steps_applied"].append({
            "step": 5,
            "description": "Point-in-time recognition",
            "pob": pob.name,
            "recognition_date": str(recognition_date),
            "amount": float(amount),
            "rationale": f"POB '{pob.name}' satisfied at a single point in time"
        })

        return [RecognitionEntry(
            transaction_id=transaction.id,
            contract_id=transaction.contract_id,
            performance_obligation_id=pob.id,
            recognition_date=recognition_date,
            recognized_amount=amount,
            deferred_amount=Decimal("0"),
            recognition_method=RecognitionMethod.POINT_IN_TIME,
            period_start=recognition_date,
            period_end=recognition_date,
            accounting_period=recognition_date.strftime("%Y-%m"),
            audit_trail=audit
        )]

    def _recognize_over_time(
        self,
        transaction: Transaction,
        contract: ContractTerms,
        pob: PerformanceObligation,
        amount: Decimal,
        audit: Dict
    ) -> List[RecognitionEntry]:
        """
        Spread revenue over the service period using straight-line method.
        Handles partial months with proration.
        """
        start_date = pob.start_date or contract.start_date
        end_date = pob.end_date or contract.end_date

        if not end_date:
            # Default to 12 months if no end date
            end_date = start_date + relativedelta(months=12)

        # Calculate total days in service period
        total_days = (end_date - start_date).days + 1

        if total_days <= 0:
            return []

        # Generate monthly recognition entries
        entries = []
        current_month_start = start_date
        total_recognized = Decimal("0")
        months = []

        while current_month_start <= end_date:
            # Find end of current month
            month_end = (current_month_start + relativedelta(months=1)) - timedelta(days=1)
            period_end = min(month_end, end_date)

            days_in_period = (period_end - current_month_start).days + 1
            period_amount = (amount * Decimal(days_in_period) / Decimal(total_days)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            months.append((current_month_start, period_end, days_in_period, period_amount))
            total_recognized += period_amount
            current_month_start = month_end + timedelta(days=1)

        # Fix rounding difference on last entry
        rounding_diff = amount - total_recognized
        if months and rounding_diff != 0:
            last = months[-1]
            months[-1] = (last[0], last[1], last[2], last[3] + rounding_diff)

        # Calculate deferred at each point (for audit trail)
        remaining_deferred = amount
        for i, (period_start, period_end, days, period_amount) in enumerate(months):
            remaining_deferred -= period_amount

            entry_audit = {**audit}
            entry_audit["steps_applied"] = audit["steps_applied"] + [{
                "step": 5,
                "description": "Over-time recognition (straight-line)",
                "pob": pob.name,
                "period": f"{period_start} to {period_end}",
                "days_in_period": days,
                "total_service_days": total_days,
                "proration": f"{days}/{total_days}",
                "period_amount": float(period_amount),
                "total_amount": float(amount),
                "remaining_deferred": float(max(remaining_deferred, Decimal("0"))),
                "method": "straight-line over service period"
            }]

            entries.append(RecognitionEntry(
                transaction_id=transaction.id,
                contract_id=transaction.contract_id,
                performance_obligation_id=pob.id,
                recognition_date=period_start,
                recognized_amount=period_amount,
                deferred_amount=max(remaining_deferred, Decimal("0")),
                recognition_method=RecognitionMethod.OVER_TIME,
                period_start=period_start,
                period_end=period_end,
                accounting_period=period_start.strftime("%Y-%m"),
                audit_trail=entry_audit
            ))

        return entries

    def generate_modification_adjustment(
        self,
        original_contract: ContractTerms,
        modified_contract: ContractTerms,
        modification_date: date,
        recognized_to_date: Decimal
    ) -> Dict[str, Any]:
        """
        Handle contract modifications per ASC 606-10-25-18.
        Determines: separate contract, prospective, or cumulative catch-up.
        """
        original_remaining_value = original_contract.total_contract_value
        new_total_value = modified_contract.total_contract_value
        value_change = new_total_value - original_remaining_value

        # Determine modification type
        if value_change > 0 and self._is_distinct_new_goods(original_contract, modified_contract):
            modification_type = "separate_contract"
            rationale = "New POBs are distinct; treat as separate contract"
            catch_up = Decimal("0")
        elif value_change != 0:
            # Cumulative catch-up method
            modification_type = "cumulative_catch_up"
            # Recalculate what should have been recognized
            proportion_satisfied = self._calculate_proportion_satisfied(
                original_contract, modification_date
            )
            should_have_recognized = new_total_value * proportion_satisfied
            catch_up = should_have_recognized - recognized_to_date
            rationale = f"Contract modified; cumulative catch-up of ${catch_up:.2f}"
        else:
            modification_type = "prospective"
            catch_up = Decimal("0")
            rationale = "Prospective treatment for remaining performance obligations"

        return {
            "modification_type": modification_type,
            "modification_date": str(modification_date),
            "value_change": float(value_change),
            "catch_up_adjustment": float(catch_up),
            "rationale": rationale,
            "asc606_reference": "ASC 606-10-25-18 through 25-21"
        }

    def _is_distinct_new_goods(self, original, modified) -> bool:
        original_pob_ids = {p.id for p in original.performance_obligations}
        modified_pob_ids = {p.id for p in modified.performance_obligations}
        return bool(modified_pob_ids - original_pob_ids)

    def _calculate_proportion_satisfied(self, contract: ContractTerms, as_of_date: date) -> Decimal:
        if not contract.end_date:
            return Decimal("0.5")
        total = (contract.end_date - contract.start_date).days
        elapsed = (as_of_date - contract.start_date).days
        if total <= 0:
            return Decimal("1")
        return Decimal(min(elapsed, total)) / Decimal(total)