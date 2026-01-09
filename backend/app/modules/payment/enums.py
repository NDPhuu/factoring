from enum import Enum

class TransactionType(str, Enum):
    FI_TO_PLATFORM = "FI_TO_PF"
    PLATFORM_TO_SME = "PF_TO_SME"
    DEBTOR_TO_PLATFORM = "DEBTOR_TO_PF"
    PLATFORM_TO_FI = "PF_TO_FI"
