/**
 * CMCC AI Model Registry
 *
 * Central registry for AI model metadata across all providers.
 * Fetches available models from provider APIs at runtime rather than
 * hardcoding model IDs. Falls back to a minimal known set when the
 * API is unreachable, so new models appear automatically without
 * requiring code changes.
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

/**
 * Capabilities an AI model supports.
 */
export type AiModelCapability =
  | 'vision'
  | 'json-mode'
  | 'function-calling'
  | 'streaming'

/**
 * Supported AI model providers.
 */
export type AiModelProvider = 'openai' | 'claude' | 'gemini'

/**
 * Metadata about an AI model available from a provider.
 */
export interface AiModelInfo {
  /** Provider model ID (e.g. "claude-sonnet-4-20250514", "gpt-4o") */
  id: string
  /** Human-readable display name (e.g. "Claude Sonnet 4", "GPT-4o") */
  displayName: string
  /** Which provider serves this model */
  provider: AiModelProvider
  /** Set of capabilities this model supports */
  capabilities: AiModelCapability[]
  /** Whether this should be the default selection for its provider */
  isDefault: boolean
}

// --------------------------------------------------------------------------
// Fallback model lists
// --------------------------------------------------------------------------
// These are only used when the provider API is unreachable. The primary
// path fetches the latest list dynamically from each provider's API.
// Keeping these minimal and generic avoids stale hardcoding.

const FALLBACK_OPENAI_MODELS: AiModelInfo[] = [
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    capabilities: ['vision', 'json-mode', 'function-calling', 'streaming'],
    isDefault: false,
  },
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: ['vision', 'json-mode', 'function-calling', 'streaming'],
    isDefault: true,
  },
  {
    id: 'o1-mini',
    displayName: 'o1-mini',
    provider: 'openai',
    capabilities: ['function-calling', 'streaming'],
    isDefault: false,
  },
]

const FALLBACK_CLAUDE_MODELS: AiModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    provider: 'claude',
    capabilities: ['vision', 'json-mode', 'streaming'],
    isDefault: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'claude',
    capabilities: ['vision', 'streaming'],
    isDefault: false,
  },
]

const FALLBACK_GEMINI_MODELS: AiModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    capabilities: ['vision', 'json-mode', 'streaming'],
    isDefault: true,
  },
  {
    id: 'gemini-2.0-pro',
    displayName: 'Gemini 2.0 Pro',
    provider: 'gemini',
    capabilities: ['vision', 'json-mode', 'streaming'],
    isDefault: false,
  },
  {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    provider: 'gemini',
    capabilities: ['vision', 'streaming'],
    isDefault: false,
  },
  {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'gemini',
    capabilities: ['vision', 'json-mode', 'streaming'],
    isDefault: false,
  },
]

// --------------------------------------------------------------------------
// Cache
// --------------------------------------------------------------------------

interface CacheEntry {
  models: AiModelInfo[]
  fetchedAt: number
}

const CACHE_TTL_MS = 300_000 // 5 minutes

const cache: Map<string, CacheEntry> = new Map()

// In-flight fetch promises to deduplicate concurrent requests
const inflightFetches: Map<string, Promise<AiModelInfo[]>> = new Map()

// --------------------------------------------------------------------------
// Provider-specific model ID patterns
// --------------------------------------------------------------------------
// Secondary check used when the API fetch hasn't completed yet.
// Kept intentionally broad so future models aren't falsely excluded.

const PROVIDER_PATTERNS: Record<string, RegExp> = {
  openai: /^(gpt|o1|o3)-/i,
  claude: /^claude-/i,
  gemini: /^gemini-/i,
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Fetch available models for a given AI provider.
 *
 * Results are cached in-memory for 5 minutes. If the provider API is
 * unreachable or no API key is available, returns a minimal fallback list.
 *
 * @param engine - The AI provider to fetch models for.
 * @param apiKey - Optional API key (required for OpenAI; Claude may return
 *                 public models without one depending on endpoint).
 * @param apiEndpoint - Optional custom API endpoint.
 * @returns A sorted array of available models.
 */
export async function fetchAvailableModels(
  engine: AiModelProvider,
  apiKey?: string,
  apiEndpoint?: string,
): Promise<AiModelInfo[]> {
  // ── Check cache ────────────────────────────────────────────────────
  const cacheKey = `${engine}::${apiEndpoint ?? 'default'}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.models
  }

  // ── Deduplicate concurrent fetches ─────────────────────────────────
  const inflight = inflightFetches.get(cacheKey)
  if (inflight) return inflight

  const fetchPromise = doFetchModels(engine, apiKey, apiEndpoint, cacheKey)
  inflightFetches.set(cacheKey, fetchPromise)

  try {
    return await fetchPromise
  } finally {
    inflightFetches.delete(cacheKey)
  }
}

/**
 * Get the default model ID for a given provider.
 *
 * Uses the API-fetched list first (from cache), then falls back
 * to the fallback list's default.
 *
 * @param engine - The AI provider.
 * @param apiKey - Optional API key for fetching fresh data.
 * @param apiEndpoint - Optional custom endpoint.
 * @returns The default model ID string.
 */
export async function getDefaultModelId(
  engine: AiModelProvider,
  apiKey?: string,
  apiEndpoint?: string,
): Promise<string> {
  let fallback: AiModelInfo[]
  switch (engine) {
    case 'openai':
      fallback = FALLBACK_OPENAI_MODELS
      break
    case 'claude':
      fallback = FALLBACK_CLAUDE_MODELS
      break
    case 'gemini':
      fallback = FALLBACK_GEMINI_MODELS
      break
  }

  // Try cache first (fast path, no network)
  const cacheKey = `${engine}::${apiEndpoint ?? 'default'}`
  const cached = cache.get(cacheKey)
  if (cached) {
    const def = cached.models.find((m) => m.isDefault)
    if (def) return def.id
    return cached.models[0]?.id ?? fallback[0]?.id ?? 'gpt-4o-mini'
  }

  // Try fetching (slower, but gives us live data)
  try {
    const models = await fetchAvailableModels(engine, apiKey, apiEndpoint)
    const def = models.find((m) => m.isDefault)
    if (def) return def.id
    return models[0]?.id ?? fallback[0]?.id ?? 'gpt-4o-mini'
  } catch {
    return (
      fallback.find((m) => m.isDefault)?.id ?? fallback[0]?.id ?? 'gpt-4o-mini'
    )
  }
}

/**
 * Check whether a model ID is compatible with the given provider.
 *
 * First checks against fetched model lists (from cache), then falls
 * back to a broad pattern match. This ensures new models from the API
 * are recognised without code changes.
 *
 * @param modelId - The model ID to check.
 * @param engine - The provider to test against.
 * @returns `true` if the model appears to belong to this provider.
 */
export function isModelCompatible(
  modelId: string,
  engine: AiModelProvider,
): boolean {
  // Check cache first
  for (const [, entry] of cache) {
    if (entry.models.some((m) => m.provider === engine && m.id === modelId)) {
      return true
    }
  }

  // Fall back to pattern matching
  const pattern = PROVIDER_PATTERNS[engine]
  return pattern ? pattern.test(modelId) : false
}

/**
 * Clear the in-memory model cache.
 * Useful after settings changes or for testing.
 */
export function clearModelCache(): void {
  cache.clear()
  inflightFetches.clear()
}

/**
 * Get all fallback model IDs for a provider (synchronous, no network).
 * Useful for initial state before API fetch completes.
 *
 * @param engine - The AI provider.
 * @returns Array of model IDs known in the fallback list.
 */
export function getFallbackModelIds(engine: AiModelProvider): string[] {
  switch (engine) {
    case 'openai':
      return FALLBACK_OPENAI_MODELS.map((m) => m.id)
    case 'claude':
      return FALLBACK_CLAUDE_MODELS.map((m) => m.id)
    case 'gemini':
      return FALLBACK_GEMINI_MODELS.map((m) => m.id)
  }
}

// --------------------------------------------------------------------------
// Internal Implementation
// --------------------------------------------------------------------------

async function doFetchModels(
  engine: AiModelProvider,
  apiKey?: string,
  apiEndpoint?: string,
  cacheKey?: string,
): Promise<AiModelInfo[]> {
  try {
    let models: AiModelInfo[]
    switch (engine) {
      case 'openai':
        models = await fetchOpenAIModels(apiKey, apiEndpoint)
        break
      case 'claude':
        models = await fetchClaudeModels(apiKey, apiEndpoint)
        break
      case 'gemini':
        models = await fetchGeminiModels(apiKey, apiEndpoint)
        break
    }

    if (models.length > 0) {
      if (cacheKey) {
        cache.set(cacheKey, { models, fetchedAt: Date.now() })
      }
      return models
    }
  } catch {
    // API unreachable — fall through to fallback
  }

  // Return fallback list but don't cache it so we retry on next call
  switch (engine) {
    case 'openai':
      return FALLBACK_OPENAI_MODELS
    case 'claude':
      return FALLBACK_CLAUDE_MODELS
    case 'gemini':
      return FALLBACK_GEMINI_MODELS
  }
}

/**
 * Fetch models from OpenAI's API.
 *
 * GET /v1/models — no authentication required for listing,
 * though an API key may be required depending on the endpoint config.
 */
async function fetchOpenAIModels(
  apiKey?: string,
  apiEndpoint?: string,
): Promise<AiModelInfo[]> {
  const endpoint = (apiEndpoint ?? 'https://api.openai.com/v1').replace(
    /\/+$/,
    '',
  )
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${endpoint}/models`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`OpenAI models API error: ${response.status}`)
  }

  const json = (await response.json()) as {
    data?: Array<{ id: string }>
  }

  if (!json.data || !Array.isArray(json.data)) {
    return []
  }

  // Filter to chat-capable models (exclude embeddings, audio, etc.)
  const chatModelPattern = /^(gpt|o1|o3)-/i

  return json.data
    .filter((m) => chatModelPattern.test(m.id))
    .map((m) => ({
      id: m.id,
      displayName: displayNameForOpenAI(m.id),
      provider: 'openai' as const,
      capabilities: inferOpenAICapabilities(m.id),
      isDefault: m.id === 'gpt-4o-mini',
    }))
}

/**
 * Fetch models from Anthropic's API.
 *
 * GET /v1/models — requires x-api-key header.
 */
async function fetchClaudeModels(
  apiKey?: string,
  apiEndpoint?: string,
): Promise<AiModelInfo[]> {
  const endpoint = (apiEndpoint ?? 'https://api.anthropic.com/v1').replace(
    /\/+$/,
    '',
  )

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const response = await fetch(`${endpoint}/models`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Claude models API error: ${response.status}`)
  }

  const json = (await response.json()) as {
    data?: Array<{
      type: string
      id: string
      display_name?: string
    }>
  }

  if (!json.data || !Array.isArray(json.data)) {
    return []
  }

  return json.data
    .filter((m) => m.type === 'model')
    .map((m) => ({
      id: m.id,
      displayName: m.display_name ?? displayNameForClaude(m.id),
      provider: 'claude' as const,
      capabilities: inferClaudeCapabilities(m.id),
      isDefault: m.id === 'claude-sonnet-4-20250514',
    }))
}

/**
 * Fetch models from Google's Gemini API.
 *
 * GET /v1beta/models — requires x-goog-api-key header.
 * The API returns models with names like "models/gemini-2.0-flash".
 */
async function fetchGeminiModels(
  apiKey?: string,
  apiEndpoint?: string,
): Promise<AiModelInfo[]> {
  const endpoint = (
    apiEndpoint ?? 'https://generativelanguage.googleapis.com/v1beta'
  ).replace(/\/+$/, '')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['x-goog-api-key'] = apiKey
  }

  const response = await fetch(`${endpoint}/models`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Gemini models API error: ${response.status}`)
  }

  const json = (await response.json()) as {
    models?: Array<{
      name: string
      displayName?: string
      supportedGenerationMethods?: string[]
    }>
  }

  if (!json.models || !Array.isArray(json.models)) {
    return []
  }

  // Filter to generation-capable models (exclude embedding, tuning, etc.)
  // Names come as "models/gemini-2.0-flash" — extract just the ID part.
  return json.models
    .filter(
      (m) => m.supportedGenerationMethods?.includes('generateContent') ?? false,
    )
    .map((m) => {
      const id = m.name.replace(/^models\//, '')
      return {
        id,
        displayName: m.displayName ?? displayNameForGemini(id),
        provider: 'gemini' as const,
        capabilities: inferGeminiCapabilities(id),
        isDefault: id === 'gemini-2.0-flash',
      }
    })
}

// --------------------------------------------------------------------------
// Display name helpers
// --------------------------------------------------------------------------

function displayNameForOpenAI(modelId: string): string {
  // Convert known model IDs to human-readable labels
  const known: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'o1-mini': 'o1-mini',
    'o1-preview': 'o1-preview',
    'o3-mini': 'o3-mini',
  }

  if (known[modelId]) return known[modelId]

  // Generic formatting for unknown models
  return modelId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function displayNameForClaude(modelId: string): string {
  const known: Record<string, string> = {
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
    'claude-2.1': 'Claude 2.1',
    'claude-2.0': 'Claude 2.0',
    'claude-instant-1.2': 'Claude Instant 1.2',
  }

  if (known[modelId]) return known[modelId]

  return modelId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function displayNameForGemini(modelId: string): string {
  const known: Record<string, string> = {
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
    'gemini-2.0-pro': 'Gemini 2.0 Pro',
    'gemini-2.0-pro-exp': 'Gemini 2.0 Pro (Experimental)',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-1.5-flash-8b': 'Gemini 1.5 Flash-8B',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.0-pro': 'Gemini 1.0 Pro',
  }

  if (known[modelId]) return known[modelId]

  return modelId
    .replace(/^gemini-/i, 'Gemini ')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// --------------------------------------------------------------------------
// Capability inference
// --------------------------------------------------------------------------

function inferOpenAICapabilities(modelId: string): AiModelCapability[] {
  const caps: AiModelCapability[] = ['streaming']

  if (/gpt-4o|gpt-4-turbo|gpt-4-vision/.test(modelId)) {
    caps.push('vision')
  }
  if (/gpt-4|o1|o3/.test(modelId)) {
    caps.push('json-mode', 'function-calling')
  } else if (/gpt-3\.5/.test(modelId)) {
    caps.push('function-calling')
  }

  return caps
}

function inferClaudeCapabilities(modelId: string): AiModelCapability[] {
  const caps: AiModelCapability[] = ['streaming']

  if (/claude-(sonnet|opus|haiku)/.test(modelId)) {
    caps.push('vision', 'json-mode')
  }

  return caps
}

function inferGeminiCapabilities(modelId: string): AiModelCapability[] {
  const caps: AiModelCapability[] = ['streaming']

  // Most Gemini models support vision natively
  if (/gemini-/.test(modelId)) {
    caps.push('vision')
  }

  // Pro and Flash models support JSON mode
  if (/(pro|flash)/.test(modelId)) {
    caps.push('json-mode')
  }

  return caps
}
