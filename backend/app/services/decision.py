def make_decision(case, memories):
    memory_text = " ".join(
        memory.text.lower()
        for memory in memories.results
    )

    evidence = []

    if "cancellation" in memory_text:
        evidence.append("Cancellation records")

    if "customer communication" in memory_text:
        evidence.append("Customer communication")

    if "generic transaction receipt" in memory_text:
        evidence.append("Do not rely only on a generic transaction receipt")

    if evidence:
        recommendation = "FIGHT"
        reason = (
            "Previous chargeback experience indicates that stronger "
            "supporting evidence is needed for this type of dispute."
        )
    else:
        recommendation = "REVIEW"
        reason = (
            "No sufficiently relevant precedent was found. "
            "Additional case review is recommended."
        )

    return {
        "recommendation": recommendation,
        "evidence_strategy": evidence,
        "reason": reason,
    }