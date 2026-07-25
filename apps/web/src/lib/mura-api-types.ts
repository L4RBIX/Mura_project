export interface TranscriptSegment {
  segment_id: string;
  start: number;
  end: number;
  text: string;
}

export interface MuraAsrSegment extends TranscriptSegment {
  chunk_id?: string | null;
}

export interface MuraTranscriptEnvelope {
  recording_id: string;
  duration_seconds: number;
  language_hints: string[];
  full_text: string;
  segments: MuraAsrSegment[];
  asr_model: string;
  asr_revision: string;
  chunker_version: string;
  processing_seconds: number | null;
  asr_metadata: Record<string, string | number | boolean>;
}

export interface MuraExtractionRequest {
  recording_id: string;
  speaker_id: string;
  speaker_name: string;
  language_hints: string[];
  segments: TranscriptSegment[];
}

export type PersonCategory =
  | "family_member"
  | "friend"
  | "other"
  | "unknown";

export type RelationshipType =
  | "parent_child"
  | "spouse"
  | "sibling"
  | "other";

export type PersonRole =
  | "parent"
  | "child"
  | "spouse"
  | "sibling"
  | "older_sibling"
  | "younger_sibling"
  | "unknown";

export type ReviewKind =
  | "ambiguity"
  | "conflict"
  | "missing_evidence"
  | "other";

export interface MuraPerson {
  person_id: string;
  name: string;
  aliases: string[];
  category: PersonCategory;
  relation_to_speaker: string | null;
  evidence_segment_ids: string[];
  needs_review: boolean;
}

export interface MuraRelationship {
  relationship_id: string;
  relationship_type: RelationshipType;
  person_a_id: string;
  person_a_role: PersonRole;
  person_b_id: string;
  person_b_role: PersonRole;
  evidence_segment_ids: string[];
  needs_review: boolean;
}

export interface MuraEvent {
  event_id: string;
  title: string;
  description: string;
  participant_person_ids: string[];
  date_text: string | null;
  location: string | null;
  evidence_segment_ids: string[];
  needs_review: boolean;
}

export interface MuraStory {
  story_id: string;
  title: string;
  summary: string;
  person_ids: string[];
  event_ids: string[];
  evidence_segment_ids: string[];
  privacy: "private";
  needs_review: boolean;
}

export interface MuraReviewItem {
  review_id: string;
  kind: ReviewKind;
  message: string;
  segment_ids: string[];
}

export interface MuraExtractionResult {
  schema_version: "simple-v1";
  recording_id: string;
  languages: string[];
  people: MuraPerson[];
  relationships: MuraRelationship[];
  events: MuraEvent[];
  stories: MuraStory[];
  review_items: MuraReviewItem[];
}

export type MuraApiErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "backend_not_configured"
  | "backend_unreachable"
  | "backend_timeout"
  | "unauthorized"
  | "provider_error"
  | "repair_failed"
  | "invalid_model_response"
  | "internal_error"
  | "backend_error";

export interface MuraValidationError {
  type: string;
  location: Array<string | number>;
  message: string;
}

export interface MuraApiError {
  error: {
    code: MuraApiErrorCode;
    message: string;
    validation_codes?: string[];
    validation_errors?: MuraValidationError[];
  };
}

type UnknownObject = { [key: string]: unknown };

const PERSON_CATEGORIES: readonly PersonCategory[] = [
  "family_member",
  "friend",
  "other",
  "unknown",
];

const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  "parent_child",
  "spouse",
  "sibling",
  "other",
];

const PERSON_ROLES: readonly PersonRole[] = [
  "parent",
  "child",
  "spouse",
  "sibling",
  "older_sibling",
  "younger_sibling",
  "unknown",
];

const REVIEW_KINDS: readonly ReviewKind[] = [
  "ambiguity",
  "conflict",
  "missing_evidence",
  "other",
];

const API_ERROR_CODES: readonly MuraApiErrorCode[] = [
  "invalid_json",
  "invalid_request",
  "backend_not_configured",
  "backend_unreachable",
  "backend_timeout",
  "unauthorized",
  "provider_error",
  "repair_failed",
  "invalid_model_response",
  "internal_error",
  "backend_error",
];

function isObject(value: unknown): value is UnknownObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: UnknownObject,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key))
  );
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableNonEmptyText(value: unknown): value is string | null {
  return value === null || isNonEmptyText(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown, minimumLength = 0): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= minimumLength &&
    value.every(isNonEmptyText)
  );
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function isDeduplicatedStringArray(
  value: unknown,
  minimumLength = 0,
): value is string[] {
  return (
    isStringArray(value, minimumLength) &&
    hasUniqueStrings(value)
  );
}

function isLiteralMember<T extends string>(
  value: unknown,
  members: readonly T[],
): value is T {
  return typeof value === "string" && members.includes(value as T);
}

function isTranscriptSegment(value: unknown): value is TranscriptSegment {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ["segment_id", "start", "end", "text"])
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.segment_id) &&
    isFiniteNumber(value.start) &&
    value.start >= 0 &&
    isFiniteNumber(value.end) &&
    value.end > value.start &&
    isNonEmptyText(value.text)
  );
}

function isMuraAsrSegment(value: unknown): value is MuraAsrSegment {
  if (
    !isObject(value) ||
    !hasExactKeys(
      value,
      ["segment_id", "start", "end", "text"],
      ["chunk_id"],
    )
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.segment_id) &&
    isFiniteNumber(value.start) &&
    value.start >= 0 &&
    isFiniteNumber(value.end) &&
    value.end > value.start &&
    isNonEmptyText(value.text) &&
    (value.chunk_id === undefined ||
      value.chunk_id === null ||
      isNonEmptyText(value.chunk_id))
  );
}

function isAsrMetadata(
  value: unknown,
): value is Record<string, string | number | boolean> {
  return (
    isObject(value) &&
    Object.values(value).every(
      (item) =>
        typeof item === "string" ||
        typeof item === "boolean" ||
        isFiniteNumber(item),
    )
  );
}

function isMuraPerson(value: unknown): value is MuraPerson {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "person_id",
      "name",
      "aliases",
      "category",
      "relation_to_speaker",
      "evidence_segment_ids",
      "needs_review",
    ])
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.person_id) &&
    isNonEmptyText(value.name) &&
    isDeduplicatedStringArray(value.aliases) &&
    isLiteralMember(value.category, PERSON_CATEGORIES) &&
    isNullableNonEmptyText(value.relation_to_speaker) &&
    isDeduplicatedStringArray(value.evidence_segment_ids, 1) &&
    typeof value.needs_review === "boolean"
  );
}

function isMuraRelationship(value: unknown): value is MuraRelationship {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "relationship_id",
      "relationship_type",
      "person_a_id",
      "person_a_role",
      "person_b_id",
      "person_b_role",
      "evidence_segment_ids",
      "needs_review",
    ])
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.relationship_id) &&
    isLiteralMember(value.relationship_type, RELATIONSHIP_TYPES) &&
    isNonEmptyText(value.person_a_id) &&
    isLiteralMember(value.person_a_role, PERSON_ROLES) &&
    isNonEmptyText(value.person_b_id) &&
    value.person_a_id !== value.person_b_id &&
    isLiteralMember(value.person_b_role, PERSON_ROLES) &&
    isDeduplicatedStringArray(value.evidence_segment_ids, 1) &&
    typeof value.needs_review === "boolean"
  );
}

function isMuraEvent(value: unknown): value is MuraEvent {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "event_id",
      "title",
      "description",
      "participant_person_ids",
      "date_text",
      "location",
      "evidence_segment_ids",
      "needs_review",
    ])
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.event_id) &&
    isNonEmptyText(value.title) &&
    isNonEmptyText(value.description) &&
    isDeduplicatedStringArray(value.participant_person_ids) &&
    isNullableNonEmptyText(value.date_text) &&
    isNullableNonEmptyText(value.location) &&
    isDeduplicatedStringArray(value.evidence_segment_ids, 1) &&
    typeof value.needs_review === "boolean"
  );
}

function isMuraStory(value: unknown): value is MuraStory {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "story_id",
      "title",
      "summary",
      "person_ids",
      "event_ids",
      "evidence_segment_ids",
      "privacy",
      "needs_review",
    ])
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.story_id) &&
    isNonEmptyText(value.title) &&
    isNonEmptyText(value.summary) &&
    isDeduplicatedStringArray(value.person_ids) &&
    isDeduplicatedStringArray(value.event_ids) &&
    isDeduplicatedStringArray(value.evidence_segment_ids, 1) &&
    value.privacy === "private" &&
    typeof value.needs_review === "boolean"
  );
}

function isMuraReviewItem(value: unknown): value is MuraReviewItem {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ["review_id", "kind", "message", "segment_ids"])
  ) {
    return false;
  }

  return (
    isNonEmptyText(value.review_id) &&
    isLiteralMember(value.kind, REVIEW_KINDS) &&
    isNonEmptyText(value.message) &&
    isDeduplicatedStringArray(value.segment_ids)
  );
}

function hasUniqueEntityIds(result: MuraExtractionResult): boolean {
  return (
    hasUniqueStrings(result.people.map((item) => item.person_id)) &&
    hasUniqueStrings(
      result.relationships.map((item) => item.relationship_id),
    ) &&
    hasUniqueStrings(result.events.map((item) => item.event_id)) &&
    hasUniqueStrings(result.stories.map((item) => item.story_id)) &&
    hasUniqueStrings(result.review_items.map((item) => item.review_id))
  );
}

function hasValidEntityReferences(result: MuraExtractionResult): boolean {
  const personIds = new Set(result.people.map((person) => person.person_id));
  const eventIds = new Set(result.events.map((event) => event.event_id));

  return (
    result.relationships.every(
      (relationship) =>
        personIds.has(relationship.person_a_id) &&
        personIds.has(relationship.person_b_id),
    ) &&
    result.events.every((event) =>
      event.participant_person_ids.every((id) => personIds.has(id)),
    ) &&
    result.stories.every(
      (story) =>
        story.person_ids.every((id) => personIds.has(id)) &&
        story.event_ids.every((id) => eventIds.has(id)),
    )
  );
}

function allEvidenceSegmentIds(result: MuraExtractionResult): string[] {
  return [
    ...result.people.flatMap((item) => item.evidence_segment_ids),
    ...result.relationships.flatMap((item) => item.evidence_segment_ids),
    ...result.events.flatMap((item) => item.evidence_segment_ids),
    ...result.stories.flatMap((item) => item.evidence_segment_ids),
    ...result.review_items.flatMap((item) => item.segment_ids),
  ];
}

export function isMuraExtractionRequest(
  value: unknown,
): value is MuraExtractionRequest {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "recording_id",
      "speaker_id",
      "speaker_name",
      "language_hints",
      "segments",
    ])
  ) {
    return false;
  }

  if (
    !isNonEmptyText(value.recording_id) ||
    !isNonEmptyText(value.speaker_id) ||
    !isNonEmptyText(value.speaker_name) ||
    !isStringArray(value.language_hints) ||
    !Array.isArray(value.segments) ||
    value.segments.length < 1 ||
    !value.segments.every(isTranscriptSegment)
  ) {
    return false;
  }

  return hasUniqueStrings(
    value.segments.map((segment) => segment.segment_id),
  );
}

export function isMuraTranscriptEnvelope(
  value: unknown,
): value is MuraTranscriptEnvelope {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "recording_id",
      "duration_seconds",
      "language_hints",
      "full_text",
      "segments",
      "asr_model",
      "asr_revision",
      "chunker_version",
      "processing_seconds",
      "asr_metadata",
    ])
  ) {
    return false;
  }

  if (
    !isNonEmptyText(value.recording_id) ||
    !isFiniteNumber(value.duration_seconds) ||
    value.duration_seconds <= 0 ||
    !isDeduplicatedStringArray(value.language_hints) ||
    !isNonEmptyText(value.full_text) ||
    !Array.isArray(value.segments) ||
    value.segments.length < 1 ||
    !value.segments.every(isMuraAsrSegment) ||
    !isNonEmptyText(value.asr_model) ||
    !isNonEmptyText(value.asr_revision) ||
    !isNonEmptyText(value.chunker_version) ||
    !(
      value.processing_seconds === null ||
      (isFiniteNumber(value.processing_seconds) &&
        value.processing_seconds >= 0)
    ) ||
    !isAsrMetadata(value.asr_metadata)
  ) {
    return false;
  }

  const transcript = value as unknown as MuraTranscriptEnvelope;
  return (
    hasUniqueStrings(
      transcript.segments.map((segment) => segment.segment_id),
    ) &&
    transcript.segments.every(
      (segment, index) =>
        index === 0 ||
        segment.start >= transcript.segments[index - 1]!.start,
    )
  );
}

export function isMuraExtractionResult(
  value: unknown,
): value is MuraExtractionResult {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "recording_id",
      "languages",
      "people",
      "relationships",
      "events",
      "stories",
      "review_items",
    ])
  ) {
    return false;
  }

  if (
    value.schema_version !== "simple-v1" ||
    !isNonEmptyText(value.recording_id) ||
    !isDeduplicatedStringArray(value.languages) ||
    !Array.isArray(value.people) ||
    !value.people.every(isMuraPerson) ||
    !Array.isArray(value.relationships) ||
    !value.relationships.every(isMuraRelationship) ||
    !Array.isArray(value.events) ||
    !value.events.every(isMuraEvent) ||
    !Array.isArray(value.stories) ||
    !value.stories.every(isMuraStory) ||
    !Array.isArray(value.review_items) ||
    !value.review_items.every(isMuraReviewItem)
  ) {
    return false;
  }

  const result = value as unknown as MuraExtractionResult;
  return hasUniqueEntityIds(result) && hasValidEntityReferences(result);
}

export function isMuraExtractionResultForRequest(
  value: unknown,
  request: MuraExtractionRequest,
): value is MuraExtractionResult {
  if (
    !isMuraExtractionResult(value) ||
    value.recording_id !== request.recording_id
  ) {
    return false;
  }

  const segmentIds = new Set(
    request.segments.map((segment) => segment.segment_id),
  );
  return allEvidenceSegmentIds(value).every((id) => segmentIds.has(id));
}

function isSafeValidationCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9_]{1,80}$/.test(value)
  );
}

function isValidationLocationPart(value: unknown): value is string | number {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function isMuraValidationError(value: unknown): value is MuraValidationError {
  return (
    isObject(value) &&
    hasExactKeys(value, ["type", "location", "message"]) &&
    isSafeValidationCode(value.type) &&
    Array.isArray(value.location) &&
    value.location.every(isValidationLocationPart) &&
    isNonEmptyText(value.message)
  );
}

export function isMuraApiError(value: unknown): value is MuraApiError {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ["error"]) ||
    !isObject(value.error) ||
    !hasExactKeys(
      value.error,
      ["code", "message"],
      ["validation_codes", "validation_errors"],
    ) ||
    !isLiteralMember(value.error.code, API_ERROR_CODES) ||
    !isNonEmptyText(value.error.message)
  ) {
    return false;
  }

  const validationCodes = value.error.validation_codes;
  if (
    validationCodes !== undefined &&
    !(
      Array.isArray(validationCodes) &&
      validationCodes.every(isSafeValidationCode) &&
      hasUniqueStrings(validationCodes)
    )
  ) {
    return false;
  }

  const validationErrors = value.error.validation_errors;
  if (
    validationErrors !== undefined &&
    !(
      Array.isArray(validationErrors) &&
      validationErrors.every(isMuraValidationError)
    )
  ) {
    return false;
  }

  return (
    (validationCodes === undefined || value.error.code === "repair_failed") &&
    (validationErrors === undefined || value.error.code === "invalid_request")
  );
}
