export type LaminaParameterType = 'text' | 'options' | 'url';
export type LaminaExecutionStatusState = 'queued' | 'running' | 'completed' | 'failed';
export type LaminaOutputType = 'image' | 'video' | 'text' | 'pending' | string;

export interface ApiEnvelope<T> {
  data: T;
}

// ─── Account / identity ─────────────────────────────────────────────────────

/** A workspace the user belongs to, with their role in it. */
export interface AccountMembership {
  workspaceId: string;
  name: string | null;
  slug: string | null;
  role: string | null;
}

/** The active workspace the API key is scoped to. */
export interface AccountWorkspace {
  id: string;
  name: string | null;
  slug: string | null;
  role: string | null;
}

export interface AccountUser {
  id: string;
  email: string | null;
}

export interface AccountResponse {
  user: AccountUser;
  workspace: AccountWorkspace | null;
  memberships: AccountMembership[];
}

export interface AppCapabilities {
  produces: string[];
  strengths: string[];
  bestFor: string[];
  limitations: string[];
  outputFormats: string[];
  hasQualityControl: boolean;
  hasHumanApproval: boolean;
  generationStepCount: number;
  nodeTypes: string[];
}

export interface AppInputSummaryEntry {
  name: string;
  type: string;
}

export interface AppInputSummary {
  required: AppInputSummaryEntry[];
  optional: AppInputSummaryEntry[];
  total: number;
}

export interface AppSummary {
  appId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  capabilities: AppCapabilities | null;
  icon?: string | null;
  modality?: string | null;
  outputFormats?: string[];
  inputSummary?: AppInputSummary;
  /** Optional empty-state media (image/video URL) usable as a card preview. */
  thumbnail?: AppThumbnail | null;
}

export interface ParameterOption {
  value: string;
  label: string;
  description?: string | null;
}

export interface Parameter {
  id: string;
  /** Author-set snake_case identifier (e.g. "your_photo_image_url"). The
   *  preferred way to reference a parameter when constructing inputs.
   *  Falls back to `name` or `id` when not set. */
  key?: string;
  name: string;
  type: LaminaParameterType;
  required: boolean;
  description?: string | null;
  options?: string[];
  default?: unknown;
  accept?: Array<'image' | 'video'>;
  multiple?: boolean;
}

export interface AppDetail {
  appId: string;
  name: string;
  description: string | null;
  parameters: Parameter[];
  capabilities: AppCapabilities | null;
}

export interface SuggestedNextStep {
  description: string;
  toolHint: string | null;
}

export interface OutputDimensions {
  width: number;
  height: number;
}

export interface ExecutionOutput {
  id: string;
  label: string;
  type: LaminaOutputType;
  value: unknown;
  status: string;
  error: string | null;
  mimeType?: string;
  contentDescription?: string | null;
  compatibleInputTypes?: string[];
  suggestedNextSteps?: string[] | SuggestedNextStep[];
  canChainAs?: string[];
  platformsOptimized?: string[];
  dimensions?: OutputDimensions | null;
  durationSeconds?: number | null;
}

export interface ExecutionStarted {
  runId: string;
  workflowId: string;
  workflowName: string;
  status: 'queued' | string;
  webhookUrl?: string;
  outputs?: ExecutionOutput[];
}

export interface QualityResult {
  score: number | null;
  threshold: number;
  passed: boolean;
  attempts: number;
}

export interface ExecutionProgress {
  totalOutputs: number;
  completedOutputs: number;
  failedOutputs: number;
  percentComplete: number | null;
}

export interface ExecutionStatus {
  runId: string;
  workflowId: string;
  status: LaminaExecutionStatusState | string;
  outputs: ExecutionOutput[];
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  quality?: QualityResult;
  progress?: ExecutionProgress;
}

export interface WebhookSigningKeyResponse {
  keys: Array<Record<string, unknown>>;
}

export interface StoredWebhookConfig {
  publicUrl?: string | null;
  host?: string;
  port?: number;
  path?: string;
  savedAt: string;
}

export interface LaminaErrorBody {
  error?: string;
  details?: string[];
  [key: string]: unknown;
}

export interface StoredLaminaCredentials {
  apiKey: string;
  baseUrl: string;
  savedAt: string;
}

export interface StoredLaminaConfig {
  version: 1;
  credentials?: StoredLaminaCredentials;
  webhook?: StoredWebhookConfig;
}

export interface LaminaClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface WaitForExecutionOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onPoll?: (payload: ExecutionStatus) => void;
}

export interface RunExecutionParams {
  inputs: Record<string, unknown>;
  webhook?: string;
}

export interface ListAppsParams {
  search?: string;
  limit?: number;
}

export interface CostEstimateBreakdown {
  nodeId: string;
  nodeType: string;
  credits: number;
}

export interface CostEstimate {
  appId: string;
  name: string;
  estimatedCredits: {
    expected: number;
    min: number;
    max: number;
  };
  breakdown: CostEstimateBreakdown[];
  currentBalance: number;
  affordable: boolean;
}

export interface DiscoverAppsParams {
  intent: string;
  constraints?: {
    maxCredits?: number;
    outputFormat?: string;
  };
  limit?: number;
}

/** Optional empty-state media derived from `parameter_definitions.settings.emptyStateMedia`.
 *  Present when the app has a recognised image/video URL there. */
export interface AppThumbnail {
  url: string;
  type: 'image' | 'video';
}

export interface DiscoveredApp {
  appId: string;
  name: string;
  description: string | null;
  relevanceScore: number;
  capabilities: AppCapabilities | null;
  estimatedCredits: number | null;
  whyMatch: string;
  /** Optional thumbnail (image or video URL) usable as a card preview. */
  thumbnail?: AppThumbnail | null;
}

export interface DiscoverAppsResult {
  matches: DiscoveredApp[];
  intent: {
    medium: string;
    summary: string;
  };
}

export interface LaminaRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export type LaminaRequestFn = <T>(path: string, init?: LaminaRequestInit) => Promise<T>;

export interface LaminaWebhookHeaders {
  signature: string | null;
  timestamp: string | null;
  requestId: string | null;
}

export interface LaminaWebhookEnvelope {
  data: ExecutionStatus;
}

export interface VerifyWebhookSignatureOptions {
  body: string | Uint8Array;
  headers: Headers | Record<string, string | string[] | undefined | null>;
  keys?: WebhookSigningKeyResponse;
  maxAgeSeconds?: number;
  nowMs?: number;
}

export interface LaminaWebhookVerificationSuccess {
  valid: true;
  payload: LaminaWebhookEnvelope;
  headers: LaminaWebhookHeaders;
  keyId: string | null;
}

export interface LaminaWebhookVerificationFailure {
  valid: false;
  error: string;
  headers: LaminaWebhookHeaders;
}

export type LaminaWebhookVerificationResult =
  | LaminaWebhookVerificationSuccess
  | LaminaWebhookVerificationFailure;

export interface LaminaWebhookListenerStatus {
  running: boolean;
  host: string;
  port: number;
  path: string;
  localUrl: string;
  publicUrl: string | null;
  eventCount: number;
}

export interface LaminaWebhookListenerEvent {
  sequence: number;
  receivedAt: string;
  verified: boolean;
  requestId: string | null;
  headers: LaminaWebhookHeaders;
  payload: LaminaWebhookEnvelope | null;
  error: string | null;
  body: string;
}

export interface WaitForWebhookEventOptions {
  timeoutMs?: number;
  afterSequence?: number;
}

// ─── Intelligence API types ────────────────────────────────────────────────

export interface BrandContextParams {
  brandProfileId?: string;
  campaignId?: string;
  workflowId?: string;
  platform?: string;
  objective?: string;
  modality?: string;
  topK?: number;
}

export interface BrandDna {
  voiceAttributes: string[];
  visualIdentity: string[];
  contentPillars: string[];
  audienceSignals: string[];
  guardrails: string[];
  toneSpectrum: {
    primary: string | null;
    secondary: string | null;
    avoid: string[];
  } | null;
  performanceProfile: {
    topPatterns: string[];
    weakPatterns: string[];
    avgEngagementTier: string | null;
  } | null;
}

export interface GuidancePackage {
  promptDirectives: string[];
  negativePrompts: string[];
  recommendedMoves: string[];
  testIdeas: string[];
  winningPatterns: string[];
  weakPatterns: string[];
  supportingMetrics: string[];
  creativeStructure: Record<string, unknown> | null;
}

export interface TopPatternItem {
  id: string;
  title: string | null;
  modality: string | null;
  platform: string | null;
  performanceScore: number;
  winningPatterns: string[];
}

export interface PatternAggregate {
  pattern: string;
  occurrences: number;
  avgPerformance: number;
}

export interface TopPatternsResult {
  topItems: TopPatternItem[];
  topPatterns: PatternAggregate[];
  weakPatterns: PatternAggregate[];
}

export interface BrandContextResponse {
  brandDna: BrandDna | null;
  guidance: GuidancePackage | null;
  topPatterns: TopPatternsResult | null;
}

export interface PredictParams {
  concept: string;
  platform: string;
  modality: string;
  brandProfileId?: string;
  campaignId?: string;
}

export interface PerformancePrediction {
  trendAlignment: number;
  brandFit: number;
  performancePrediction: number;
  fatigueRisk: number;
  confidence: number;
  reasoning: string[];
  comparableContentItemIds: string[];
  recommendedAdjustments: string[];
}

export interface RecommendationsParams {
  campaignId?: string;
  workflowId?: string;
  brandProfileId?: string;
  platform?: string;
  objective?: string;
  modality?: string;
  limit?: number;
}

export interface Recommendation {
  id: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  summary: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface TrendsParams {
  category?: string;
  platform?: string;
  windowDays?: number;
  limit?: number;
}

export interface TrendPatternEntry {
  label: string;
  momentum: number;
  exampleContentItemIds: string[];
  formatDescription: string;
}

export interface TrendPatternSummary {
  category: string;
  platform: string | null;
  topPatterns: TrendPatternEntry[];
  emergingPatterns: Array<{ label: string; momentum: number }>;
  decliningPatterns: Array<{ label: string; momentum: number }>;
  windowStart: string;
  windowEnd: string;
}

// ─── Publishing API types ──────────────────────────────────────────────────

export interface ConnectedChannel {
  id: string;
  platform: string;
  accountName: string | null;
  accountType: string | null;
  username: string | null;
  hasInstagram: boolean;
  createdAt: string;
}

export interface PublishParams {
  accountIds: string[];
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
}

export interface PublishResultItem {
  accountId: string;
  platform: string;
  accountName: string | null;
  status: 'success' | 'error';
  postUrl?: string;
  error?: string;
}

export interface PublishSummary {
  total: number;
  success: number;
  failed: number;
}

export interface PublishResult {
  results: PublishResultItem[];
  summary: PublishSummary;
}

export interface TransferAssetParams {
  sourceUrl: string;
  mediaType: 'image' | 'video' | 'audio';
  filename?: string;
}

export interface TransferAssetResult {
  cdnUrl: string;
  assetId: string;
  filename: string;
}

export interface PublishHistoryParams {
  status?: string;
  platform?: string;
  limit?: number;
}

export interface PublishHistoryItem {
  id: string;
  platform: string;
  contentType: string;
  contentUrl: string | null;
  caption: string | null;
  postUrl: string | null;
  status: string;
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
}

// ─── Compound API types ────────────────────────────────────────────────────

export interface SelectedApp {
  appId: string;
  name: string;
  whyMatched: string;
  confidence: number;
}

export interface BrandContextSummary {
  voiceAttributes: string[];
  contentPillars: string[];
  guardrails: string[];
}

export interface GuidanceSummary {
  promptDirectives: string[];
  negativePrompts: string[];
}

export interface MissingInput {
  id: string | null;
  name: string;
  type: LaminaParameterType | string;
  description?: string | null;
  accept?: Array<'image' | 'video'> | string[] | null;
  examples?: unknown[];
}

export interface NeedsInput {
  message: string;
  missing: MissingInput[];
  suggestedPrompt?: string;
}

export interface AutoQualityConfig {
  enabled?: boolean;
  minScore?: number;
  maxRetries?: number;
}

export interface LaminaCreateParams {
  brief: string;
  platform?: string;
  modality?: string;
  brandProfileId?: string;
  campaignId?: string;
  appId?: string;
  inputs?: Record<string, unknown>;
  autoQuality?: AutoQualityConfig;
  templateId?: string;
  aspectRatio?: string;
  metadata?: Record<string, unknown>;
}

export interface LaminaCreateResult {
  runId: string | null;
  workflowId: string;
  workflowName: string;
  status: string;
  selectedApp: SelectedApp;
  brandContext: BrandContextSummary | null;
  guidanceSummary: GuidanceSummary | null;
  needsInput?: NeedsInput;
}

export interface ScoreContentParams {
  contentItemIds?: string[];
  platform?: string;
  modality?: string;
  limit?: number;
}

export interface ContentConcept {
  title: string;
  concept: string;
  prompt: string;
  platform: string;
  modality: string;
  format: string;
  predictedPerformance: string;
  rationale: string;
}

export interface ContentBriefParams {
  goal: string;
  platform?: string;
  modality?: string;
  count?: number;
  brandProfileId?: string;
  metadata?: Record<string, unknown>;
}

export interface ContentBriefResult {
  concepts: ContentConcept[];
}

// ─── POST /v1/content/plan ───────────────────────────────────────────────────
// Lightweight planner: given a brief, picks an app and classifies each input
// as drafted | defaulted | must_supply. With autoDispatch=true, dispatches when
// nothing's missing. Otherwise always returns a plan and never dispatches.

export interface ContentPlanParams {
  brief: string;
  appId?: string;
  platform?: string;
  modality?: string;
  brandProfileId?: string;
  campaignId?: string;
  /** POSTed to on completion (only used when the planner dispatches). */
  webhookUrl?: string;
  /**
   * Default false → dispatch when askUser is empty. Pass `true` to never
   * dispatch (preview-then-apply mode).
   */
  planOnly?: boolean;
}

export interface ContentPlanSelectedApp {
  /**
   * App UUID when an app was picked, or `null` when the planner fell back
   * to a freestyle model (no catalog app matched). Callers should not
   * special-case freestyle for display — `name`, `purpose`, `rationale`
   * are populated identically in both cases.
   */
  appId: string | null;
  name: string;
  /** One-line summary of what the app/model does. */
  purpose: string;
  /** One-sentence reason this was picked for this brief. */
  rationale: string;
  /** Confidence in [0, 1]. */
  confidence: number;
}

export interface ContentPlanAskUserItem {
  /** Parameter key (snake_case) that needs to be supplied. */
  key: string;
  /** Schema type (`url`, `text`, `options`, ...). */
  type: string;
  /** What this input controls in the output, in plain language. */
  purpose: string;
  /** Question to relay to the user. */
  askUser: string;
}

export interface ContentPlanCost {
  /** Best estimate. */
  expected: number;
  /** Lower bound. */
  min: number;
  /** Upper bound (workflow may retry / branch). */
  max: number;
}

export interface ContentPlanBrandSummary {
  voiceAttributes: string[];
  contentPillars: string[];
  guardrails: string[];
}

export interface ContentPlanGuidanceSummary {
  promptDirectives: string[];
  negativePrompts: string[];
}

export interface ContentPlanResult {
  status: 'dispatched' | 'needs_input' | 'unmatched';
  /** Null when status is `unmatched`. */
  selectedApp: ContentPlanSelectedApp | null;
  /** Inputs the agent filled directly from the brief. */
  drafted: Record<string, unknown>;
  /** Inputs taking the workflow author's default. */
  defaulted: Record<string, unknown>;
  /** Inputs the caller must collect from the user. */
  askUser: ContentPlanAskUserItem[];
  /** Estimated credit cost for the chosen app. Null when unestimable. */
  cost: ContentPlanCost | null;
  /** Workspace brand context applied to drafting. Null when not configured. */
  brandContext: ContentPlanBrandSummary | null;
  /** Active guidance package applied to drafting. Null when not configured. */
  guidanceSummary: ContentPlanGuidanceSummary | null;
  /** Set when status=`dispatched`. */
  runId: string | null;
  /**
   * Discriminates which polling endpoint resolves the runId. `app` runs use
   * `client.runs.wait(runId)` / `lamina runs wait`. `freestyle` runs use
   * `client.freestyle.wait(runId)` because the planner fell back to a base
   * model. Null when no run was dispatched.
   */
  runType: 'app' | 'freestyle' | null;
  /** True when the dispatched run will POST to the request's webhookUrl. */
  webhookEnabled: boolean;
  /** Suggested `lamina run ...` command when status=`needs_input` and askUser is empty. */
  dispatchHint: string | null;
  /** Set when status=`unmatched`. */
  reason?: string;
}

// ─── POST /v1/content/auto-generate ──────────────────────────────────────────

export interface AutoGenerateParams {
  brief: string;
  document: Record<string, unknown>;
  fieldName?: string;
  fieldDescription?: string;
  constraints?: {
    modality?: 'image' | 'video' | 'audio' | 'text';
    aspectRatio?: string;
    outputFormats?: string[];
  };
  appId?: string;
  webhookUrl?: string;
  agentSessionId?: string;
  /** Number of variants to generate when the agent picks the freestyle path. Server clamps to [1, 8]. */
  numVariants?: number;
}

export interface AgentTraceStep {
  iteration: number;
  toolName: 'searchApps' | 'getApp' | 'validateInputs' | 'startRun' | 'returnNeedsChoice';
  args: unknown;
  result: unknown;
}

export interface AutoGenerateStarted {
  status: 'started';
  runId: string;
  /**
   * Set to 'freestyle' when the agent dispatched parallel FAL calls (no app match).
   * When present, poll via `client.freestyle.wait(runId)` instead of `client.runs.wait(runId)`.
   * Absent (or 'app') for normal app-run starts.
   */
  mode?: 'freestyle' | 'app';
  /** App-run only. Absent on freestyle. */
  selectedApp?: { appId: string; name: string; rationale: string };
  /** App-run only. Absent on freestyle. */
  draftedInputs?: Record<string, unknown>;
  /** Freestyle-only enrichments. */
  reason?: string;
  numVariants?: number;
  submittedCount?: number;
  failedCount?: number;
  agentTrace?: AgentTraceStep[];
}

export interface AutoGenerateNeedsChoice {
  status: 'needs_choice';
  reason: string;
  candidates: Array<{
    appId: string;
    name: string;
    description: string;
    missingRequiredInputs: string[];
    draftableInputs: Record<string, unknown>;
  }>;
  agentTrace?: AgentTraceStep[];
}

export type AutoGenerateResult = AutoGenerateStarted | AutoGenerateNeedsChoice;

// ─── Preview-Run flow (non-dispatching review-then-confirm) ──────────────────
//
// `preview-run` runs the content-router agent in PREVIEW MODE. It returns the
// agent's PROPOSED plan (chosen app + drafted inputs + missing inputs OR
// freestyle recipe) WITHOUT dispatching anything. The caller (plugin) renders a
// decision card; user reviews, edits, fills missing, and clicks Generate-confirm
// to call `content.run()` which actually dispatches.

export interface PreviewRunParams {
  brief: string;
  document: Record<string, unknown>;
  fieldName?: string;
  fieldDescription?: string;
  constraints?: {
    modality?: 'image' | 'video' | 'audio' | 'text';
    aspectRatio?: string;
    outputFormats?: string[];
  };
  /** When the user explicitly picked an app from the picker. Server skips searchApps. */
  appId?: string;
  numVariants?: number;
}

/** Per-input source label. Tells the user where a value came from. */
export type DraftedInputSource =
  | `doc.${string}`
  | 'agent_creative'
  | 'agent_inferred'
  | 'agent_inferred_url';

export interface DraftedInput {
  value: unknown;
  source: DraftedInputSource;
}

export interface SuggestedDefault {
  source: string; // e.g., 'doc.coverImage'
  value: unknown;
  label: string; // human-readable, e.g., 'Image from this doc'
}

/**
 * Agent-emitted form-spec field. The agent decides per missing input which
 * widget the plugin should render — kind+question+(options|placeholder|accept) —
 * so exotic app input types (productPicker, colorPicker, aspectRatio, etc.)
 * get translated by the LLM into one of these 5 Sanity-renderable widgets
 * rather than relying on a deterministic SDK-side type collapse.
 *
 * The plugin renders this with a pure `switch (field.kind)`. No widget logic
 * outside this file.
 */
export interface FormFieldBase {
  /** App parameter name. Must match a real input declared by the app. */
  name: string;
  /** User-facing question (agent-authored when the agent asked, schema-derived otherwise). */
  question: string;
  /** Server-suggested default the user can one-tap accept (e.g., a doc-asset URL for media kinds). */
  suggestedDefault?: SuggestedDefault | null;
}

export interface FormFieldText extends FormFieldBase {
  kind: 'text';
  /** Optional hint, e.g. 'e.g. 16:9' for an aspect-ratio-as-text field. */
  placeholder?: string;
}

export interface FormFieldSelect extends FormFieldBase {
  kind: 'select';
  /** Choices the agent picked. For app params with declared options this MUST
   *  be a subset; for free-form types the agent may invent a small enum. */
  options: string[];
}

export interface FormFieldMedia extends FormFieldBase {
  /** Renders as a URL paste field with media-typed placeholder. Real Sanity
   *  asset upload is a future swap of this widget. */
  kind: 'image' | 'video' | 'audio';
}

export type FormField = FormFieldText | FormFieldSelect | FormFieldMedia;

/**
 * A note from the agent about a user-supplied dialog setting (aspectRatio,
 * numVariants, etc.) that the chosen app cannot honor. Surfaced to the user
 * as a muted info line so they know what's happening transparently.
 */
export interface PreviewWarning {
  /** Dialog control name — e.g. "aspectRatio", "numVariants", "outputFormats". */
  field: string;
  /** One-sentence user-facing message — e.g. "This app produces a fixed 16:9 layout — your 9:16 selection won't apply." */
  message: string;
}

export interface PreviewAppMode {
  mode: 'app';
  selectedApp: {
    appId: string;
    name: string;
    description?: string | null;
    rationale: string;
    schema?: unknown[]; // app's full input schema (agent-friendly shape)
  };
  draftedInputs: Record<string, DraftedInput>;
  /**
   * Agent-emitted form spec for inputs the agent could not draft. Empty array
   * means "everything was drafted — auto-dispatch, no UI". Non-empty means
   * render the form. Plugin renders pure switch on `field.kind`.
   */
  form: FormField[];
  /**
   * Agent-emitted warnings for user dialog settings the chosen app cannot
   * honor. Empty when everything was applied successfully. Plugin renders
   * these as a muted info line above the form / variants.
   */
  warnings?: PreviewWarning[];
  estimate: { credits: { expected: number; min: number; max: number } | null; manageUrl: string | null };
}

export interface PreviewFreestyleMode {
  mode: 'freestyle';
  freestylePlan: {
    modality: 'image' | 'video';
    rationale: string;
    variants: Array<Record<string, unknown>>; // per-variant model picks + prompts
  };
  estimate: { credits: null; manageUrl: null };
}

/**
 * Returned when the agent could not produce a valid plan. Plugin should
 * show the errors and let the user retry / pick an app manually.
 */
export interface PreviewAgentFailedMode {
  mode: 'agent_failed';
  reason: string;
  /** Validator error strings from the last failed attempt — surfaced for debugging. */
  errors: string[];
  /** App the agent had picked when it failed (so plugin can suggest "try this app manually"). */
  selectedApp?: {
    appId: string;
    name: string;
  } | null;
}

export type PreviewRunResult =
  | PreviewAppMode
  | PreviewFreestyleMode
  | PreviewAgentFailedMode;

// ─── Confirmed-Run params (the dispatch step after preview) ──────────────────

export interface RunConfirmedAppParams {
  mode: 'app';
  appId: string;
  inputs: Record<string, unknown>;
  rationale?: string;
  webhookUrl?: string;
}

export interface RunConfirmedFreestyleParams {
  mode: 'freestyle';
  freestyleRecipe: {
    modality: 'image' | 'video';
    rationale?: string;
    variants: Array<Record<string, unknown>>;
  };
  intent?: string;
  metadata?: Record<string, unknown>;
  numVariants?: number;
}

export type RunConfirmedParams = RunConfirmedAppParams | RunConfirmedFreestyleParams;

export interface RunConfirmedResult {
  mode: 'app' | 'freestyle';
  runId: string;
  /** App mode only. */
  selectedApp?: { appId: string; name: string; rationale: string };
  draftedInputs?: Record<string, unknown>;
  /** Freestyle mode only. */
  mediaType?: string;
  picks?: string;
  numVariants?: number;
  submittedCount?: number;
  failedCount?: number;
  reason?: string | null;
}

// ─── Runs API: new endpoints ──────────────────────────────────────────────

export interface ServerWaitOptions {
  timeout?: number;
}

export interface ServerWaitEnvelope {
  data: ExecutionStatus;
  timeout?: boolean;
}

export interface FeedbackParams {
  feedback: string;
}

export interface RefinedNode {
  nodeId: string;
  reason: string;
}

export interface FeedbackResult {
  runId: string;
  status: string;
  summary: string;
  refinedNodes: RefinedNode[];
  outputs: ExecutionOutput[];
  errorMessage: string | null;
}

export interface ListRunsParams {
  status?: string;
  appId?: string;
  limit?: number;
  offset?: number;
  since?: string;
}

export interface RunSummary {
  runId: string;
  workflowId: string;
  status: LaminaExecutionStatusState | string;
  source: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface ListRunsResult {
  data: RunSummary[];
  pagination: Pagination;
}
