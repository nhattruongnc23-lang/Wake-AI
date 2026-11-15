from abc import ABC, abstractmethod
from .contracts import VisualResult


class VisionBackend(ABC):
    """Model adapter contract. Implementations must never persist or log image bytes."""

    name = "unconfigured"
    version = "0.0.0"

    @abstractmethod
    def analyze(self, image_bytes: bytes, mime_type: str) -> VisualResult:
        raise NotImplementedError


class UnavailableBackend(VisionBackend):
    """Safe default: no model is silently substituted and no result is fabricated."""

    def analyze(self, image_bytes: bytes, mime_type: str) -> VisualResult:
        raise RuntimeError("No vision model is configured")
