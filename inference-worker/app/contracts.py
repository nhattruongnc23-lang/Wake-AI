from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class VisualStyle(str, Enum):
    REAL_PHOTO = "REAL_PHOTO"
    ANIME_MANGA = "ANIME_MANGA"
    CARTOON_ILLUSTRATION = "CARTOON_ILLUSTRATION"
    AI_GENERATED = "AI_GENERATED"
    UNKNOWN = "UNKNOWN"


class SafetyGate(str, Enum):
    CLEAR = "CLEAR"
    RESTRICTED = "RESTRICTED"
    UNCERTAIN = "UNCERTAIN"


class Category(str, Enum):
    SEXUAL_CONTENT = "SEXUAL_CONTENT"
    VIOLENCE = "VIOLENCE"
    GORE = "GORE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class VisualResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    style: VisualStyle = VisualStyle.UNKNOWN
    safetyGate: SafetyGate = SafetyGate.UNCERTAIN
    category: Category = Category.UNKNOWN
    severity: Severity = Severity.UNKNOWN
    confidence: float | None = Field(default=None, ge=0, le=1)
    signals: list[str] = Field(default_factory=list, max_length=8)

    def fail_closed(self) -> "VisualResult":
        # The current Wake policy restricts all sexual-content results and every
        # result whose safety gate is not explicitly CLEAR.
        if self.safetyGate != SafetyGate.CLEAR or self.category == Category.SEXUAL_CONTENT:
            self.safetyGate = SafetyGate.RESTRICTED
        return self
