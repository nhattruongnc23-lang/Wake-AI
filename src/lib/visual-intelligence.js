export const VISUAL_STYLES = Object.freeze([
  "REAL_PHOTO",
  "ANIME_MANGA",
  "CARTOON_ILLUSTRATION",
  "AI_GENERATED",
  "UNKNOWN"
]);

export const SAFETY_GATES = Object.freeze(["CLEAR", "RESTRICTED", "UNCERTAIN"]);
export const CATEGORIES = Object.freeze(["SEXUAL_CONTENT", "VIOLENCE", "GORE", "OTHER", "UNKNOWN"]);
export const SEVERITIES = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]);

const isOneOf = (value, values) => values.includes(value);

export function normalizeVisualResult(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid analyzer result" };
  }

  const style = isOneOf(input.style, VISUAL_STYLES) ? input.style : "UNKNOWN";
  const safetyGate = isOneOf(input.safetyGate, SAFETY_GATES) ? input.safetyGate : "UNCERTAIN";
  const category = isOneOf(input.category, CATEGORIES) ? input.category : "UNKNOWN";
  const severity = isOneOf(input.severity, SEVERITIES) ? input.severity : "UNKNOWN";
  const confidence = input.confidence == null ? null : Number(input.confidence);

  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    return { ok: false, error: "Confidence must be between 0 and 1" };
  }

  const signals = Array.isArray(input.signals)
    ? input.signals.filter(value => typeof value === "string").slice(0, 8)
      .map(value => value.replace(/[^A-Z0-9_:-]/gi, "").slice(0, 40))
    : [];

  // Fail closed: missing/unknown gate, uncertain age/safety, or any sexual category
  // remains restricted under the current conservative media policy.
  const restricted = safetyGate !== "CLEAR" || category === "SEXUAL_CONTENT";

  return {
    ok: true,
    result: {
      style,
      safetyGate,
      category,
      severity,
      confidence,
      restricted,
      status: restricted ? "RESTRICTED" : category === "UNKNOWN" ? "UNCLASSIFIED" : "PENDING",
      signals
    }
  };
}
