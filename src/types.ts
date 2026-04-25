export type LaminaParameterType = 'text' | 'options' | 'url';
export type LaminaExecutionStatusState = 'queued' | 'running' | 'completed' | 'failed';
export type LaminaOutputType = 'image' | 'video' | 'text' | 'pending' | string;

export interface ApiEnvelope<T> {
  data: T;
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

export interface AppSummary {
  appId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  capabilities: AppCapabilities | null;
}

export interface ParameterOption {
  value: string;
  label: string;
  description?: string | null;
}

export interface Parameter {
  id: string;
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

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface WorkflowStructure {
  appId: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
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

export interface DiscoveredApp {
  appId: string;
  name: string;
  description: string | null;
  relevanceScore: number;
  capabilities: AppCapabilities | null;
  estimatedCredits: number | null;
  whyMatch: string;
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
}

export interface ContentBriefResult {
  concepts: ContentConcept[];
}
