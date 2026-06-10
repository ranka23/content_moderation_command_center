/**
 * CMCC AI-Powered Moderation Module
 *
 * This module provides types and interfaces for AI-powered content moderation
 * including spam scoring, language detection, sentiment analysis, and image
 * moderation. Supports multiple AI backends (OpenAI, Claude, local ML, custom API).
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// AI Engine Configuration
// --------------------------------------------------------------------------

/**
 * Supported AI detection engines.
 */
export type AiDetectionEngine =
  | 'none'
  | 'local'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'custom'

/**
 * Configuration for an AI moderation engine.
 */
export interface AiEngineConfig {
  /** The AI engine to use */
  engine: AiDetectionEngine
  /** API endpoint URL (for custom/openai/claude) */
  apiEndpoint?: string
  /** API key for authentication */
  apiKey?: string
  /** Model name/version to use */
  model?: string
  /** Maximum content length to send to AI (chars) */
  maxContentLength?: number
  /** Request timeout in milliseconds */
  timeoutMs?: number
}

// --------------------------------------------------------------------------
// Content Classification Results
// --------------------------------------------------------------------------

/**
 * Result of AI spam scoring.
 */
export interface AiSpamScore {
  /** Overall spam score 0-100 */
  score: number
  /** Confidence level of the AI prediction 0-1 */
  confidence: number
  /** Human-readable reason for the score */
  reason: string
  /** Detailed breakdown of scoring factors */
  factors: AiScoringFactor[]
}

/**
 * Individual scoring factor contributing to the overall spam score.
 */
export interface AiScoringFactor {
  name: string
  score: number
  weight: number
  description: string
}

/**
 * Detected language information.
 */
export interface LanguageDetection {
  /** ISO 639-1 language code */
  language: string
  /** Confidence level 0-1 */
  confidence: number
  /** Human-readable language name */
  languageName: string
}

/**
 * Sentiment analysis result.
 */
export interface SentimentAnalysis {
  /** Sentiment label */
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  /** Score -1 (very negative) to 1 (very positive) */
  score: number
  /** Confidence level 0-1 */
  confidence: number
  /** Toxicity score 0-1 */
  toxicityScore: number
  /** Whether the content is considered toxic */
  isToxic: boolean
  /** Specific toxic categories detected */
  toxicCategories: string[]
}

/**
 * Image moderation result.
 */
export interface ImageModerationResult {
  /** Whether the image is considered safe */
  isSafe: boolean
  /** Confidence level 0-1 */
  confidence: number
  /** Categories of inappropriate content detected */
  categories: ImageModerationCategory[]
  /** Moderation action to take */
  suggestedAction: 'approve' | 'flag' | 'reject'
}

/**
 * Categories for image moderation.
 */
export interface ImageModerationCategory {
  name: string
  score: number
  confidence: number
}

/**
 * Combined AI moderation result for a piece of content.
 */
export interface AiModerationResult {
  /** Unique ID for this moderation request */
  id: string
  /** The content that was analyzed */
  contentPreview: string
  /** Spam score analysis */
  spamScore: AiSpamScore
  /** Language detection */
  language?: LanguageDetection
  /** Sentiment analysis */
  sentiment?: SentimentAnalysis
  /** Image moderation result (if applicable) */
  imageModeration?: ImageModerationResult
  /** Recommended action based on AI analysis */
  recommendedAction: 'approve' | 'flag' | 'spam' | 'discard'
  /** Timestamp of analysis */
  analyzedAt: string
  /** Engine that performed the analysis */
  engine: AiDetectionEngine
  /** Processing time in milliseconds */
  processingTimeMs: number
}

// --------------------------------------------------------------------------
// Pattern Learning
// --------------------------------------------------------------------------

/**
 * A learned pattern from moderator actions for improving AI classification.
 */
export interface LearnedPattern {
  id: string
  /** Pattern type */
  type: 'keyword' | 'pattern' | 'behavior' | 'source'
  /** The pattern value (regex, keyword, IP range, etc.) */
  value: string
  /** Weight/importance of this pattern */
  weight: number
  /** Confidence in this pattern 0-1 */
  confidence: number
  /** Number of times this pattern has been observed */
  observationCount: number
  /** Suggested action for this pattern */
  suggestedAction: 'flag' | 'spam' | 'approve'
  /** When this pattern was first observed */
  firstObserved: string
  /** When this pattern was last observed */
  lastObserved: string
  /** Moderator feedback score (-1 to 1) */
  feedbackScore: number
}

/**
 * Pattern learning configuration.
 */
export interface PatternLearningConfig {
  enabled: boolean
  /** Minimum observations before pattern is applied */
  minObservations: number
  /** Minimum confidence threshold */
  minConfidence: number
  /** Learning rate 0-1 */
  learningRate: number
  /** Forgetting factor for old patterns 0-1 */
  forgettingFactor: number
}

// --------------------------------------------------------------------------
// AI Provider Adapter Interface
// --------------------------------------------------------------------------

/**
 * Generic AI provider adapter interface.
 * Implement this to support different AI backends.
 */
export interface AiProviderAdapter {
  /** Provider name */
  name: string
  /** Check if the provider is properly configured */
  isConfigured(): boolean
  /** Classify content spam score */
  classifySpam(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AiSpamScore>
  /** Detect language */
  detectLanguage(text: string): Promise<LanguageDetection>
  /** Analyze sentiment */
  analyzeSentiment(text: string): Promise<SentimentAnalysis>
  /** Moderate an image (URL or base64) */
  moderateImage(imageUrl: string): Promise<ImageModerationResult>
  /** Full content moderation pipeline */
  moderateContent(
    content: string,
    options?: {
      imageUrl?: string
      context?: Record<string, unknown>
    },
  ): Promise<AiModerationResult>
  /** Learn from moderator feedback */
  learnFromFeedback(
    content: string,
    moderatorAction: string,
    aiAction: string,
  ): Promise<void>
}

// --------------------------------------------------------------------------
// Default Configuration
// --------------------------------------------------------------------------

/**
 * Default AI moderation configuration.
 */
export function getDefaultAiConfig(): AiEngineConfig {
  return {
    engine: 'none',
    maxContentLength: 5000,
    timeoutMs: 30000,
  }
}

/**
 * Default pattern learning configuration.
 */
export function getDefaultPatternLearningConfig(): PatternLearningConfig {
  return {
    enabled: true,
    minObservations: 5,
    minConfidence: 0.7,
    learningRate: 0.1,
    forgettingFactor: 0.05,
  }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function generateId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

const PROFANITY_LIST: readonly string[] = [
  'fuck',
  'shit',
  'ass',
  'bitch',
  'damn',
  'crap',
  'dick',
  'bastard',
  'piss',
  'slut',
  'whore',
  'cock',
  'cunt',
  'douche',
  'asshole',
]

function contentHasProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return PROFANITY_LIST.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lower)
  })
}

// --------------------------------------------------------------------------
// Local AI Adapter — Built-in keyword-based moderation
// --------------------------------------------------------------------------

/**
 * Built-in local AI adapter that uses keyword matching, character-range
 * language detection, and basic sentiment analysis. Always configured.
 */
export class LocalAiAdapter implements AiProviderAdapter {
  readonly name = 'local'

  private readonly learnedPatterns: LearnedPattern[] = []

  private readonly spamKeywords: readonly string[] = [
    'buy now',
    'click here',
    'free money',
    'act now',
    'limited offer',
    'congratulations you won',
    'you are a winner',
    'click below',
    'subscribe now',
    'earn money fast',
    'work from home',
    'make money',
    'cash bonus',
    'no deposit',
    'free membership',
    'opt in',
    'sign up free',
    'double your',
    'instant access',
    'limited time',
    'exclusive deal',
    'act fast',
    "don't delete",
    'this is not spam',
    'dear friend',
    'cheap',
    'discount',
    'price',
    'amazing offer',
    'risk free',
  ]

  private readonly positiveWords: readonly string[] = [
    'good',
    'great',
    'amazing',
    'excellent',
    'wonderful',
    'fantastic',
    'beautiful',
    'love',
    'happy',
    'delightful',
    'perfect',
    'awesome',
    'brilliant',
    'outstanding',
    'superb',
    'magnificent',
    'splendid',
    'terrific',
    'marvelous',
    'glorious',
    'nice',
    'pleasant',
    'enjoyable',
  ]

  private readonly negativeWords: readonly string[] = [
    'bad',
    'terrible',
    'horrible',
    'awful',
    'hate',
    'ugly',
    'disgusting',
    'dreadful',
    'atrocious',
    'abysmal',
    'hideous',
    'repulsive',
    'offensive',
    'vile',
    'nasty',
    'cruel',
    'mean',
    'vicious',
    'brutal',
    'savage',
    'angry',
    'furious',
    'enraged',
    'sad',
    'depressing',
    'miserable',
  ]

  isConfigured(): boolean {
    return true
  }

  async classifySpam(
    content: string,
    _context?: Record<string, unknown>,
  ): Promise<AiSpamScore> {
    const factors: AiScoringFactor[] = []
    const lowerContent = content.toLowerCase()

    // Factor 1 — spam keyword presence
    const matchedKeywords = this.spamKeywords.filter((kw) =>
      lowerContent.includes(kw),
    )
    const keywordScore = Math.min(100, matchedKeywords.length * 18)
    factors.push({
      name: 'spam_keywords',
      score: keywordScore,
      weight: 0.35,
      description:
        matchedKeywords.length > 0
          ? `Found ${matchedKeywords.length} spam keywords: ${matchedKeywords.slice(0, 5).join(', ')}${matchedKeywords.length > 5 ? '...' : ''}`
          : 'No spam keywords detected',
    })

    // Factor 2 — excessive capitalization
    const upperChars = content.replace(/[^A-Z]/g, '').length
    const nonSpaceChars = content.replace(/\s/g, '').length
    const capsRatio = nonSpaceChars > 0 ? upperChars / nonSpaceChars : 0
    const capsScore = Math.min(100, Math.round(capsRatio * 200))
    factors.push({
      name: 'excessive_caps',
      score: capsScore,
      weight: 0.15,
      description:
        capsRatio > 0.5
          ? `High capitalization ratio: ${(capsRatio * 100).toFixed(0)}%`
          : 'Normal capitalization levels',
    })

    // Factor 3 — excessive punctuation
    const excessivePunct = (content.match(/[!?]{2,}/g) || []).length
    const punctScore = Math.min(100, excessivePunct * 25)
    factors.push({
      name: 'excessive_punctuation',
      score: punctScore,
      weight: 0.1,
      description:
        excessivePunct > 0
          ? `Found ${excessivePunct} instances of excessive punctuation`
          : 'Normal punctuation usage',
    })

    // Factor 4 — URL ratio
    const urlMatches = content.match(/https?:\/\/[^\s]+/g)
    const urlCount = urlMatches ? urlMatches.length : 0
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length
    const urlRatio = wordCount > 0 ? urlCount / wordCount : 0
    const urlScore = Math.min(100, Math.round(urlRatio * 500))
    factors.push({
      name: 'url_ratio',
      score: urlScore,
      weight: 0.25,
      description:
        urlCount > 0
          ? `Found ${urlCount} URLs (${(urlRatio * 100).toFixed(0)}% of content)`
          : 'No URLs detected',
    })

    // Factor 5 — repeated characters
    const repeatedChars = (content.match(/(.)\1{3,}/g) || []).length
    const repeatScore = Math.min(100, repeatedChars * 20)
    factors.push({
      name: 'repeated_characters',
      score: repeatScore,
      weight: 0.15,
      description:
        repeatedChars > 0
          ? `Found ${repeatedChars} instances of repeated characters`
          : 'No unusual character repetition',
    })

    // Weighted average score
    let totalWeight = 0
    let weightedSum = 0
    for (const factor of factors) {
      weightedSum += factor.score * factor.weight
      totalWeight += factor.weight
    }
    const baseScore =
      totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0

    // Apply learned patterns
    const patternBoost = this.applyLearnedPatterns(content)
    const finalScore = Math.min(100, baseScore + patternBoost)

    // Reason
    let reason: string
    if (finalScore >= 70) {
      reason = 'High probability of spam: multiple spam indicators detected'
    } else if (finalScore >= 40) {
      reason = 'Moderate spam indicators found'
    } else if (finalScore >= 20) {
      reason = 'Minor spam indicators detected'
    } else {
      reason = 'Content appears legitimate'
    }
    if (patternBoost > 0) {
      reason += ` (matched ${patternBoost > 15 ? 'strong' : 'weak'} learned patterns)`
    }

    // Confidence is higher when the signal is clear (very low or very high scores)
    const confidence =
      finalScore >= 80 || finalScore <= 10
        ? 0.9
        : finalScore >= 50 || finalScore <= 30
          ? 0.75
          : 0.6

    return {
      score: finalScore,
      confidence,
      reason,
      factors,
    }
  }

  private applyLearnedPatterns(content: string): number {
    let additionalScore = 0
    const lowerContent = content.toLowerCase()

    for (const pattern of this.learnedPatterns) {
      if (pattern.observationCount < 3) continue
      if (lowerContent.includes(pattern.value.toLowerCase())) {
        additionalScore += pattern.weight * pattern.confidence * 20
      }
    }

    return Math.min(50, additionalScore)
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    if (text.length === 0) {
      return { language: 'en', confidence: 0.5, languageName: 'English' }
    }

    const charCodes: number[] = [...text]
      .map((c) => c.codePointAt(0) ?? 0)
      .filter((c) => c > 0x007f)

    if (charCodes.length === 0) {
      return { language: 'en', confidence: 0.95, languageName: 'English' }
    }

    // Count script categories
    let cyrillicCount = 0
    let cjkCount = 0
    let arabicCount = 0
    let devanagariCount = 0
    let greekCount = 0

    for (const code of charCodes) {
      if (
        (code >= 0x0400 && code <= 0x04ff) ||
        (code >= 0x0500 && code <= 0x052f)
      ) {
        cyrillicCount++
      } else if (
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3400 && code <= 0x4dbf) ||
        (code >= 0x3040 && code <= 0x309f) ||
        (code >= 0x30a0 && code <= 0x30ff) ||
        (code >= 0xac00 && code <= 0xd7af)
      ) {
        cjkCount++
      } else if (code >= 0x0600 && code <= 0x06ff) {
        arabicCount++
      } else if (code >= 0x0900 && code <= 0x097f) {
        devanagariCount++
      } else if (code >= 0x0370 && code <= 0x03ff) {
        greekCount++
      }
    }

    const totalNonAscii = charCodes.length

    // Determine dominant script
    if (cyrillicCount > totalNonAscii * 0.5) {
      return {
        language: 'ru',
        confidence: cyrillicCount / totalNonAscii,
        languageName: 'Russian',
      }
    }
    if (cjkCount > totalNonAscii * 0.3) {
      // Simplified heuristic — best guess among CJK languages
      return {
        language: 'zh',
        confidence: cjkCount / totalNonAscii,
        languageName: 'Chinese',
      }
    }
    if (arabicCount > totalNonAscii * 0.5) {
      return {
        language: 'ar',
        confidence: arabicCount / totalNonAscii,
        languageName: 'Arabic',
      }
    }
    if (devanagariCount > totalNonAscii * 0.5) {
      return {
        language: 'hi',
        confidence: devanagariCount / totalNonAscii,
        languageName: 'Hindi',
      }
    }
    if (greekCount > totalNonAscii * 0.5) {
      return {
        language: 'el',
        confidence: greekCount / totalNonAscii,
        languageName: 'Greek',
      }
    }

    // Default to English
    return {
      language: 'en',
      confidence: 0.4,
      languageName: 'English',
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const lowerText = text.toLowerCase()
    const words = lowerText.split(/\W+/).filter((w) => w.length > 0)

    let positiveCount = 0
    let negativeCount = 0

    for (const word of words) {
      if (this.positiveWords.includes(word)) positiveCount++
      if (this.negativeWords.includes(word)) negativeCount++
    }

    const totalSentimentWords = positiveCount + negativeCount

    let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
    let score: number

    if (totalSentimentWords === 0) {
      sentiment = 'neutral'
      score = 0
    } else if (positiveCount > 0 && negativeCount > 0) {
      sentiment = 'mixed'
      score = (positiveCount - negativeCount) / totalSentimentWords
    } else if (positiveCount > 0) {
      sentiment = 'positive'
      score = positiveCount / Math.max(words.length, 1)
    } else {
      sentiment = 'negative'
      score = -(negativeCount / Math.max(words.length, 1))
    }

    // Clamp to -1..1
    score = Math.max(-1, Math.min(1, score))

    // Toxicity detection
    const toxicWords = [
      'hate',
      'kill',
      'die',
      'stupid',
      'idiot',
      'ugly',
      'terrible',
      'awful',
      'horrible',
      'disgusting',
      'offensive',
      'vulgar',
      'obscene',
      'murder',
      'violent',
      'attack',
      'destroy',
      'threat',
      'abuse',
    ]
    const toxicWordCount = words.filter((w) => toxicWords.includes(w)).length
    const toxicityScore = Math.min(
      1,
      (toxicWordCount / Math.max(words.length, 1)) * 20,
    )
    const isToxic = toxicityScore > 0.3

    const toxicCategories: string[] = []
    if (toxicWordCount > 0) {
      toxicCategories.push('hateful_language')
    }
    if (contentHasProfanity(text)) {
      toxicCategories.push('profanity')
    }
    if (
      words.some((w) =>
        ['kill', 'murder', 'violent', 'attack', 'destroy', 'threat'].includes(
          w,
        ),
      )
    ) {
      toxicCategories.push('violence')
    }

    const confidence =
      totalSentimentWords > 0 ? Math.min(0.95, totalSentimentWords / 10) : 0.5

    return {
      sentiment,
      score,
      confidence,
      toxicityScore,
      isToxic,
      toxicCategories,
    }
  }

  async moderateImage(_imageUrl: string): Promise<ImageModerationResult> {
    // Local adapter cannot perform image analysis; default to safe.
    return {
      isSafe: true,
      confidence: 0.5,
      categories: [],
      suggestedAction: 'approve',
    }
  }

  async moderateContent(
    content: string,
    options?: { imageUrl?: string; context?: Record<string, unknown> },
  ): Promise<AiModerationResult> {
    const startTime = Date.now()
    const id = generateId()
    const preview =
      content.length > 100 ? `${content.slice(0, 100)}...` : content

    const [spamScore, language, sentiment, imageModeration] = await Promise.all(
      [
        this.classifySpam(content, options?.['context']),
        this.detectLanguage(content),
        this.analyzeSentiment(content),
        options?.['imageUrl']
          ? this.moderateImage(options['imageUrl'] as string)
          : undefined,
      ],
    )

    const recommendedAction = this.determineAction(
      spamScore,
      sentiment,
      imageModeration,
    )

    return {
      id,
      contentPreview: preview,
      spamScore,
      language,
      sentiment,
      ...(imageModeration !== undefined ? { imageModeration } : {}),
      recommendedAction,
      analyzedAt: new Date().toISOString(),
      engine: 'local',
      processingTimeMs: Date.now() - startTime,
    }
  }

  private determineAction(
    spamScore: AiSpamScore,
    sentiment: SentimentAnalysis,
    imageModeration: ImageModerationResult | undefined,
  ): 'approve' | 'flag' | 'spam' | 'discard' {
    if (imageModeration && imageModeration.suggestedAction === 'reject') {
      return 'discard'
    }
    if (spamScore.score >= 80) {
      return 'discard'
    }
    if (spamScore.score >= 60) {
      return 'spam'
    }
    if (sentiment.isToxic && sentiment.toxicityScore > 0.7) {
      return 'discard'
    }
    if (sentiment.isToxic) {
      return 'flag'
    }
    if (imageModeration && !imageModeration.isSafe) {
      return 'flag'
    }
    if (spamScore.score >= 40) {
      return 'flag'
    }
    return 'approve'
  }

  async learnFromFeedback(
    content: string,
    moderatorAction: string,
    _aiAction: string,
  ): Promise<void> {
    const words = content
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
    const uniqueWords = [...new Set(words)]

    for (const word of uniqueWords) {
      const existing = this.learnedPatterns.find(
        (p) => p.type === 'keyword' && p.value === word,
      )

      if (existing) {
        existing.observationCount++
        existing.lastObserved = new Date().toISOString()
        if (moderatorAction === 'spam' || moderatorAction === 'flag') {
          existing.feedbackScore = Math.min(1, existing.feedbackScore + 0.1)
        } else {
          existing.feedbackScore = Math.max(-1, existing.feedbackScore - 0.1)
        }
        existing.confidence = Math.min(1, existing.observationCount / 10)
        existing.weight = Math.min(1, existing.weight + 0.05)
      } else {
        const isNegative =
          moderatorAction === 'spam' || moderatorAction === 'flag'
        this.learnedPatterns.push({
          id: generateId(),
          type: 'keyword',
          value: word,
          weight: isNegative ? 0.5 : 0.2,
          confidence: 0.3,
          observationCount: 1,
          suggestedAction: isNegative ? 'flag' : 'approve',
          firstObserved: new Date().toISOString(),
          lastObserved: new Date().toISOString(),
          feedbackScore: isNegative ? 0.1 : -0.1,
        })
      }
    }
  }
}

// --------------------------------------------------------------------------
// OpenAI Adapter — Cloud-based AI moderation via OpenAI API
// --------------------------------------------------------------------------

/**
 * OpenAI-based AI adapter that delegates all moderation tasks to the OpenAI
 * API (Chat Completions and Moderation endpoints).
 */
export class OpenAiAdapter implements AiProviderAdapter {
  readonly name = 'openai'

  private readonly apiKey: string
  private readonly model: string
  private readonly maxContentLength: number
  private readonly timeoutMs: number
  private readonly apiEndpoint: string

  constructor(config: AiEngineConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI adapter requires an API key')
    }
    if (!config.model) {
      throw new Error(
        'OpenAI adapter requires a model. Use getDefaultModelId("openai") to resolve one.',
      )
    }
    this.apiKey = config.apiKey
    this.model = config.model
    this.maxContentLength = config.maxContentLength ?? 5000
    this.timeoutMs = config.timeoutMs ?? 30000
    this.apiEndpoint = config.apiEndpoint ?? 'https://api.openai.com/v1'
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async classifySpam(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AiSpamScore> {
    const truncated = this.truncateContent(content)

    let userMsg = `Classify this content for spam. Return a JSON object with:
- "score": number (0-100, higher = more likely spam)
- "confidence": number (0-1)
- "reason": string
- "factors": array of { "name": string, "score": number (0-100), "weight": number (0-1), "description": string }

Content:\n${truncated}`

    if (context) {
      const ctxLines: string[] = []
      for (const [key, value] of Object.entries(context)) {
        ctxLines.push(`${key}: ${String(value)}`)
      }
      if (ctxLines.length > 0) {
        userMsg += `\n\nAdditional context:\n${ctxLines.join('\n')}`
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a content moderation assistant. Always respond with valid JSON.',
        },
        { role: 'user', content: userMsg },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
    }

    const data = await this.callChatCompletions(body)
    const contentStr = this.parseChatContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    return {
      score: (parsed['score'] as number) ?? 0,
      confidence: (parsed['confidence'] as number) ?? 0,
      reason: (parsed['reason'] as string) ?? 'No reason provided',
      factors: this.parseFactors(parsed),
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    const truncated = this.truncateContent(text)

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a language detection assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: `Detect the language of the following text. Return a JSON object with:
- "language": ISO 639-1 language code (e.g., "en", "fr", "de", "es", "zh", "ja")
- "confidence": number (0-1)
- "languageName": full human-readable language name

Text:\n${truncated}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    }

    const data = await this.callChatCompletions(body)
    const contentStr = this.parseChatContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    return {
      language: (parsed['language'] as string) ?? 'en',
      confidence: (parsed['confidence'] as number) ?? 0,
      languageName: (parsed['languageName'] as string) ?? 'English',
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const truncated = this.truncateContent(text)

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a sentiment analysis assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: `Analyze the sentiment of the following text. Return a JSON object with:
- "sentiment": "positive" | "negative" | "neutral" | "mixed"
- "score": number (-1 to 1, where -1 = very negative, 1 = very positive)
- "confidence": number (0-1)
- "toxicityScore": number (0-1)
- "isToxic": boolean
- "toxicCategories": string[] (e.g., ["hateful_language", "profanity", "violence"])

Text:\n${truncated}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    }

    const data = await this.callChatCompletions(body)
    const contentStr = this.parseChatContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    const toxicCategories = parsed['toxicCategories'] as
      | Array<unknown>
      | undefined

    return {
      sentiment:
        (parsed['sentiment'] as
          | 'positive'
          | 'negative'
          | 'neutral'
          | 'mixed') ?? 'neutral',
      score: (parsed['score'] as number) ?? 0,
      confidence: (parsed['confidence'] as number) ?? 0,
      toxicityScore: (parsed['toxicityScore'] as number) ?? 0,
      isToxic: (parsed['isToxic'] as boolean) ?? false,
      toxicCategories: toxicCategories
        ? toxicCategories.map((c) => String(c))
        : [],
    }
  }

  async moderateImage(imageUrl: string): Promise<ImageModerationResult> {
    // Use the configured model to analyze the image for inappropriate content.
    // The model should support vision capabilities — resolved by the settings layer.
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image for inappropriate content. Return a JSON object with:\n- "isSafe": boolean\n- "confidence": number (0-1)\n- "categories": array of { "name": string, "score": number (0-1), "confidence": number (0-1) }\n- "suggestedAction": "approve" | "flag" | "reject"',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 300,
    }

    const data = await this.callChatCompletions(body)
    const contentStr = this.parseChatContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    const rawCategories = parsed['categories'] as Array<unknown> | undefined
    const categories: ImageModerationCategory[] = rawCategories
      ? rawCategories.map((c) => {
          const cat = c as Record<string, unknown>
          return {
            name: (cat['name'] as string) ?? 'unknown',
            score: (cat['score'] as number) ?? 0,
            confidence: (cat['confidence'] as number) ?? 0,
          }
        })
      : []

    return {
      isSafe: (parsed['isSafe'] as boolean) ?? true,
      confidence: (parsed['confidence'] as number) ?? 0.5,
      categories,
      suggestedAction:
        (parsed['suggestedAction'] as 'approve' | 'flag' | 'reject') ??
        'approve',
    }
  }

  async moderateContent(
    content: string,
    options?: { imageUrl?: string; context?: Record<string, unknown> },
  ): Promise<AiModerationResult> {
    const startTime = Date.now()
    const id = generateId()
    const preview =
      content.length > 100 ? `${content.slice(0, 100)}...` : content

    const [spamScore, language, sentiment, imageModeration] = await Promise.all(
      [
        this.classifySpam(content, options?.['context']),
        this.detectLanguage(content),
        this.analyzeSentiment(content),
        options?.['imageUrl']
          ? this.moderateImage(options['imageUrl'] as string)
          : undefined,
      ],
    )

    let recommendedAction: 'approve' | 'flag' | 'spam' | 'discard'
    if (imageModeration && imageModeration.suggestedAction === 'reject') {
      recommendedAction = 'discard'
    } else if (spamScore.score >= 80) {
      recommendedAction = 'discard'
    } else if (spamScore.score >= 60) {
      recommendedAction = 'spam'
    } else if (sentiment.isToxic && sentiment.toxicityScore > 0.7) {
      recommendedAction = 'discard'
    } else if (sentiment.isToxic) {
      recommendedAction = 'flag'
    } else if (imageModeration && !imageModeration.isSafe) {
      recommendedAction = 'flag'
    } else if (spamScore.score >= 40) {
      recommendedAction = 'flag'
    } else {
      recommendedAction = 'approve'
    }

    return {
      id,
      contentPreview: preview,
      spamScore,
      language,
      sentiment,
      ...(imageModeration !== undefined ? { imageModeration } : {}),
      recommendedAction,
      analyzedAt: new Date().toISOString(),
      engine: 'openai',
      processingTimeMs: Date.now() - startTime,
    }
  }

  async learnFromFeedback(
    _content: string,
    _moderatorAction: string,
    _aiAction: string,
  ): Promise<void> {
    // OpenAI adapter does not persist feedback; this is a no-op.
    // Future work may store patterns locally or send to a fine-tuning API.
  }

  // --- Private helpers ---

  private truncateContent(content: string): string {
    if (content.length > this.maxContentLength) {
      return content.slice(0, this.maxContentLength) + '\n...[truncated]'
    }
    return content
  }

  private async callChatCompletions(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} — ${errorText}`,
      )
    }

    const json = (await response.json()) as Record<string, unknown>
    return json
  }

  private parseChatContent(data: Record<string, unknown>): string {
    const choices = data['choices'] as
      | Array<Record<string, unknown>>
      | undefined
    if (!choices || choices.length === 0) {
      throw new Error('OpenAI API response has no choices')
    }

    const firstChoice = choices[0]
    if (!firstChoice) {
      throw new Error('OpenAI API response has an empty choices array')
    }

    const message = firstChoice['message'] as
      | Record<string, unknown>
      | undefined
    if (!message) {
      throw new Error('OpenAI API response missing message in choice')
    }

    const content = message['content'] as string | undefined
    if (content === undefined) {
      throw new Error('OpenAI API response missing content in message')
    }

    return content
  }

  private parseFactors(parsed: Record<string, unknown>): AiScoringFactor[] {
    const raw = parsed['factors'] as Array<unknown> | undefined
    if (!raw) return []

    return raw.map((item) => {
      const f = item as Record<string, unknown>
      return {
        name: (f['name'] as string) ?? '',
        score: (f['score'] as number) ?? 0,
        weight: (f['weight'] as number) ?? 0,
        description: (f['description'] as string) ?? '',
      }
    })
  }
}

// --------------------------------------------------------------------------
// Claude Adapter — Cloud-based AI moderation via Anthropic Claude API
// --------------------------------------------------------------------------

/**
 * Claude-based AI adapter that delegates all moderation tasks to the Anthropic
 * Claude API (Messages endpoint).
 */
export class ClaudeAdapter implements AiProviderAdapter {
  readonly name = 'claude'

  private readonly apiKey: string
  private readonly model: string
  private readonly maxContentLength: number
  private readonly timeoutMs: number
  private readonly apiEndpoint: string
  private readonly apiVersion: string

  constructor(config: AiEngineConfig) {
    if (!config.apiKey) {
      throw new Error('Claude adapter requires an API key')
    }
    if (!config.model) {
      throw new Error(
        'Claude adapter requires a model. Use getDefaultModelId("claude") to resolve one.',
      )
    }
    this.apiKey = config.apiKey
    this.model = config.model
    this.maxContentLength = config.maxContentLength ?? 5000
    this.timeoutMs = config.timeoutMs ?? 30000
    this.apiEndpoint = config.apiEndpoint ?? 'https://api.anthropic.com/v1'
    this.apiVersion = '2023-06-01'
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async classifySpam(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AiSpamScore> {
    const truncated = this.truncateContent(content)

    let userMsg = `Classify this content for spam. Return a JSON object with:
- "score": number (0-100, higher = more likely spam)
- "confidence": number (0-1)
- "reason": string
- "factors": array of { "name": string, "score": number (0-100), "weight": number (0-1), "description": string }

Content:\n${truncated}`

    if (context) {
      const ctxLines: string[] = []
      for (const [key, value] of Object.entries(context)) {
        ctxLines.push(`${key}: ${String(value)}`)
      }
      if (ctxLines.length > 0) {
        userMsg += `\n\nAdditional context:\n${ctxLines.join('\n')}`
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 400,
      system:
        'You are a content moderation assistant. Always respond with valid JSON.',
      messages: [{ role: 'user', content: userMsg }],
    }

    const data = await this.callMessages(body)
    const contentStr = this.parseMessagesContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    return {
      score: (parsed['score'] as number) ?? 0,
      confidence: (parsed['confidence'] as number) ?? 0,
      reason: (parsed['reason'] as string) ?? 'No reason provided',
      factors: this.parseFactors(parsed),
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    const truncated = this.truncateContent(text)

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 100,
      system:
        'You are a language detection assistant. Always respond with valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Detect the language of the following text. Return a JSON object with:
- "language": ISO 639-1 language code (e.g., "en", "fr", "de", "es", "zh", "ja")
- "confidence": number (0-1)
- "languageName": full human-readable language name

Text:\n${truncated}`,
        },
      ],
    }

    const data = await this.callMessages(body)
    const contentStr = this.parseMessagesContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    return {
      language: (parsed['language'] as string) ?? 'en',
      confidence: (parsed['confidence'] as number) ?? 0,
      languageName: (parsed['languageName'] as string) ?? 'English',
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const truncated = this.truncateContent(text)

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 200,
      system:
        'You are a sentiment analysis assistant. Always respond with valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Analyze the sentiment of the following text. Return a JSON object with:
- "sentiment": "positive" | "negative" | "neutral" | "mixed"
- "score": number (-1 to 1, where -1 = very negative, 1 = very positive)
- "confidence": number (0-1)
- "toxicityScore": number (0-1)
- "isToxic": boolean
- "toxicCategories": string[] (e.g., ["hateful_language", "profanity", "violence"])

Text:\n${truncated}`,
        },
      ],
    }

    const data = await this.callMessages(body)
    const contentStr = this.parseMessagesContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    const toxicCategories = parsed['toxicCategories'] as
      | Array<unknown>
      | undefined

    return {
      sentiment:
        (parsed['sentiment'] as
          | 'positive'
          | 'negative'
          | 'neutral'
          | 'mixed') ?? 'neutral',
      score: (parsed['score'] as number) ?? 0,
      confidence: (parsed['confidence'] as number) ?? 0,
      toxicityScore: (parsed['toxicityScore'] as number) ?? 0,
      isToxic: (parsed['isToxic'] as boolean) ?? false,
      toxicCategories: toxicCategories
        ? toxicCategories.map((c) => String(c))
        : [],
    }
  }

  async moderateImage(imageUrl: string): Promise<ImageModerationResult> {
    // Use Claude vision to analyze the image for inappropriate content.
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image for inappropriate content. Return a JSON object with:\n- "isSafe": boolean\n- "confidence": number (0-1)\n- "categories": array of { "name": string, "score": number (0-1), "confidence": number (0-1) }\n- "suggestedAction": "approve" | "flag" | "reject"',
            },
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
          ],
        },
      ],
    }

    const data = await this.callMessages(body)
    const contentStr = this.parseMessagesContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    const rawCategories = parsed['categories'] as Array<unknown> | undefined
    const categories: ImageModerationCategory[] = rawCategories
      ? rawCategories.map((c) => {
          const cat = c as Record<string, unknown>
          return {
            name: (cat['name'] as string) ?? 'unknown',
            score: (cat['score'] as number) ?? 0,
            confidence: (cat['confidence'] as number) ?? 0,
          }
        })
      : []

    return {
      isSafe: (parsed['isSafe'] as boolean) ?? true,
      confidence: (parsed['confidence'] as number) ?? 0.5,
      categories,
      suggestedAction:
        (parsed['suggestedAction'] as 'approve' | 'flag' | 'reject') ??
        'approve',
    }
  }

  async moderateContent(
    content: string,
    options?: {
      imageUrl?: string
      context?: Record<string, unknown>
    },
  ): Promise<AiModerationResult> {
    const startTime = Date.now()
    const id = generateId()
    const preview =
      content.length > 100 ? `${content.slice(0, 100)}...` : content

    const [spamScore, language, sentiment, imageModeration] = await Promise.all(
      [
        this.classifySpam(content, options?.context),
        this.detectLanguage(content),
        this.analyzeSentiment(content),
        options?.imageUrl
          ? this.moderateImage(options.imageUrl)
          : Promise.resolve(undefined),
      ],
    )

    let recommendedAction: 'approve' | 'flag' | 'spam' | 'discard'
    if (imageModeration && imageModeration.suggestedAction === 'reject') {
      recommendedAction = 'discard'
    } else if (spamScore.score >= 80) {
      recommendedAction = 'discard'
    } else if (spamScore.score >= 60) {
      recommendedAction = 'spam'
    } else if (sentiment.isToxic && sentiment.toxicityScore > 0.7) {
      recommendedAction = 'discard'
    } else if (sentiment.isToxic) {
      recommendedAction = 'flag'
    } else if (imageModeration && !imageModeration.isSafe) {
      recommendedAction = 'flag'
    } else if (spamScore.score >= 40) {
      recommendedAction = 'flag'
    } else {
      recommendedAction = 'approve'
    }

    return {
      id,
      contentPreview: preview,
      spamScore,
      language,
      sentiment,
      ...(imageModeration !== undefined ? { imageModeration } : {}),
      recommendedAction,
      analyzedAt: new Date().toISOString(),
      engine: 'claude',
      processingTimeMs: Date.now() - startTime,
    }
  }

  async learnFromFeedback(
    _content: string,
    _moderatorAction: string,
    _aiAction: string,
  ): Promise<void> {
    // Claude adapter does not persist feedback; this is a no-op.
    // Future work may store patterns locally or send to a fine-tuning API.
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private truncateContent(content: string): string {
    if (content.length > this.maxContentLength) {
      return content.slice(0, this.maxContentLength) + '\n...[truncated]'
    }
    return content
  }

  private async callMessages(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.apiEndpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Claude API error: ${response.status} ${response.statusText} — ${errorText}`,
      )
    }

    const json = (await response.json()) as Record<string, unknown>
    return json
  }

  private parseMessagesContent(data: Record<string, unknown>): string {
    const content = data['content'] as
      | Array<Record<string, unknown>>
      | undefined
    if (!content || content.length === 0) {
      throw new Error('Claude API response has no content')
    }

    const firstBlock = content[0]
    if (!firstBlock) {
      throw new Error('Claude API response has an empty content array')
    }

    const text = firstBlock['text'] as string | undefined
    if (text === undefined) {
      throw new Error(
        'Claude API response missing text in the first content block',
      )
    }

    return text
  }

  private parseFactors(parsed: Record<string, unknown>): AiScoringFactor[] {
    const raw = parsed['factors'] as Array<unknown> | undefined
    if (!raw) return []

    return raw.map((item) => {
      const f = item as Record<string, unknown>
      return {
        name: (f['name'] as string) ?? '',
        score: (f['score'] as number) ?? 0,
        weight: (f['weight'] as number) ?? 0,
        description: (f['description'] as string) ?? '',
      }
    })
  }
}

export class GeminiAdapter implements AiProviderAdapter {
  readonly name = 'gemini'

  private readonly apiKey: string
  private readonly model: string
  private readonly maxContentLength: number
  private readonly timeoutMs: number
  private readonly apiEndpoint: string

  constructor(config: AiEngineConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini adapter requires an API key')
    }
    if (!config.model) {
      throw new Error(
        'Gemini adapter requires a model. Use getDefaultModelId("gemini") to resolve one.',
      )
    }
    this.apiKey = config.apiKey
    this.model = config.model
    this.maxContentLength = config.maxContentLength ?? 5000
    this.timeoutMs = config.timeoutMs ?? 30000
    this.apiEndpoint =
      config.apiEndpoint ?? 'https://generativelanguage.googleapis.com/v1beta'
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async classifySpam(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AiSpamScore> {
    const truncated = this.truncateContent(content)

    let userMsg = `Classify this content for spam. Return a JSON object with:\n- "score": number (0-100, higher = more likely spam)\n- "confidence": number (0-1)\n- "reason": string\n- "factors": array of { "name": string, "score": number (0-100), "weight": number (0-1), "description": string }\n\nContent:\n${truncated}`

    if (context) {
      const ctxLines: string[] = []
      for (const [key, value] of Object.entries(context)) {
        ctxLines.push(`${key}: ${String(value)}`)
      }
      if (ctxLines.length > 0) {
        userMsg += `\n\nAdditional context:\n${ctxLines.join('\n')}`
      }
    }

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      systemInstruction: {
        parts: [
          {
            text: 'You are a content moderation assistant. Always respond with valid JSON.',
          },
        ],
      },
    }

    const data = await this.callGenerateContent(body)
    const contentStr = this.parseGenerateContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    return {
      score: (parsed['score'] as number) ?? 0,
      confidence: (parsed['confidence'] as number) ?? 0,
      reason: (parsed['reason'] as string) ?? 'No reason provided',
      factors: this.parseFactors(parsed),
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    const truncated = this.truncateContent(text)

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Detect the language of the following text. Return a JSON object with:\n- "language": ISO 639-1 language code (e.g., "en", "fr", "de", "es", "zh", "ja")\n- "confidence": number (0-1)\n- "languageName": full human-readable language name\n\nText:\n${truncated}`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: 'You are a language detection assistant. Always respond with valid JSON.',
          },
        ],
      },
    }

    const data = await this.callGenerateContent(body)
    const contentStr = this.parseGenerateContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    return {
      language: (parsed['language'] as string) ?? 'en',
      confidence: (parsed['confidence'] as number) ?? 0,
      languageName: (parsed['languageName'] as string) ?? 'English',
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const truncated = this.truncateContent(text)

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze the sentiment of the following text. Return a JSON object with:\n- "sentiment": "positive" | "negative" | "neutral" | "mixed"\n- "score": number (-1 to 1, where -1 = very negative, 1 = very positive)\n- "confidence": number (0-1)\n- "toxicityScore": number (0-1)\n- "isToxic": boolean\n- "toxicCategories": string[] (e.g., ["hateful_language", "profanity", "violence"])\n\nText:\n${truncated}`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: 'You are a sentiment analysis assistant. Always respond with valid JSON.',
          },
        ],
      },
    }

    const data = await this.callGenerateContent(body)
    const contentStr = this.parseGenerateContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    const toxicCategories = parsed['toxicCategories'] as
      | Array<unknown>
      | undefined

    return {
      sentiment:
        (parsed['sentiment'] as
          | 'positive'
          | 'negative'
          | 'neutral'
          | 'mixed') ?? 'neutral',
      score: (parsed['score'] as number) ?? 0,
      confidence: (parsed['confidence'] as number) ?? 0,
      toxicityScore: (parsed['toxicityScore'] as number) ?? 0,
      isToxic: (parsed['isToxic'] as boolean) ?? false,
      toxicCategories: toxicCategories
        ? toxicCategories.map((c) => String(c))
        : [],
    }
  }

  async moderateImage(imageUrl: string): Promise<ImageModerationResult> {
    // Fetch the image and convert to base64 for Gemini's inlineData format
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image for moderation: ${imageResponse.status} ${imageResponse.statusText}`,
      )
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Data = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageResponse.headers.get('content-type') ?? 'image/jpeg'

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Analyze this image for inappropriate content. Return a JSON object with:\n- "isSafe": boolean\n- "confidence": number (0-1)\n- "categories": array of { "name": string, "score": number (0-1), "confidence": number (0-1) }\n- "suggestedAction": "approve" | "flag" | "reject"',
            },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    }

    const data = await this.callGenerateContent(body)
    const contentStr = this.parseGenerateContent(data)
    const parsed = JSON.parse(contentStr) as Record<string, unknown>

    const rawCategories = parsed['categories'] as Array<unknown> | undefined
    const categories: ImageModerationCategory[] = rawCategories
      ? rawCategories.map((c) => {
          const cat = c as Record<string, unknown>
          return {
            name: (cat['name'] as string) ?? 'unknown',
            score: (cat['score'] as number) ?? 0,
            confidence: (cat['confidence'] as number) ?? 0,
          }
        })
      : []

    return {
      isSafe: (parsed['isSafe'] as boolean) ?? true,
      confidence: (parsed['confidence'] as number) ?? 0.5,
      categories,
      suggestedAction:
        (parsed['suggestedAction'] as 'approve' | 'flag' | 'reject') ??
        'approve',
    }
  }

  async moderateContent(
    content: string,
    options?: {
      imageUrl?: string
      context?: Record<string, unknown>
    },
  ): Promise<AiModerationResult> {
    const startTime = Date.now()
    const id = generateId()
    const preview =
      content.length > 100 ? `${content.slice(0, 100)}...` : content

    const [spamScore, language, sentiment, imageModeration] = await Promise.all(
      [
        this.classifySpam(content, options?.context),
        this.detectLanguage(content),
        this.analyzeSentiment(content),
        options?.imageUrl
          ? this.moderateImage(options.imageUrl)
          : Promise.resolve(undefined),
      ],
    )

    let recommendedAction: 'approve' | 'flag' | 'spam' | 'discard'
    if (imageModeration && imageModeration.suggestedAction === 'reject') {
      recommendedAction = 'discard'
    } else if (spamScore.score >= 80) {
      recommendedAction = 'discard'
    } else if (spamScore.score >= 60) {
      recommendedAction = 'spam'
    } else if (sentiment.isToxic && sentiment.toxicityScore > 0.7) {
      recommendedAction = 'discard'
    } else if (sentiment.isToxic) {
      recommendedAction = 'flag'
    } else if (imageModeration && !imageModeration.isSafe) {
      recommendedAction = 'flag'
    } else if (spamScore.score >= 40) {
      recommendedAction = 'flag'
    } else {
      recommendedAction = 'approve'
    }

    return {
      id,
      contentPreview: preview,
      spamScore,
      language,
      sentiment,
      ...(imageModeration !== undefined ? { imageModeration } : {}),
      recommendedAction,
      analyzedAt: new Date().toISOString(),
      engine: 'gemini',
      processingTimeMs: Date.now() - startTime,
    }
  }

  async learnFromFeedback(
    _content: string,
    _moderatorAction: string,
    _aiAction: string,
  ): Promise<void> {
    // Gemini adapter does not persist feedback; this is a no-op.
    // Future work may store patterns locally or send to a fine-tuning API.
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private truncateContent(content: string): string {
    if (content.length > this.maxContentLength) {
      return content.slice(0, this.maxContentLength) + '\n...[truncated]'
    }
    return content
  }

  private async callGenerateContent(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${this.apiEndpoint}/models/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText} — ${errorText}`,
      )
    }

    const json = (await response.json()) as Record<string, unknown>
    return json
  }

  private parseGenerateContent(data: Record<string, unknown>): string {
    const candidates = data['candidates'] as
      | Array<Record<string, unknown>>
      | undefined
    if (!candidates || candidates.length === 0) {
      throw new Error('Gemini API response has no candidates')
    }

    const firstCandidate = candidates[0]
    if (!firstCandidate) {
      throw new Error('Gemini API response has an empty candidates array')
    }

    const content = firstCandidate['content'] as
      | Record<string, unknown>
      | undefined
    if (!content) {
      throw new Error(
        'Gemini API response missing content in the first candidate',
      )
    }

    const parts = content['parts'] as Array<Record<string, unknown>> | undefined
    if (!parts || parts.length === 0) {
      throw new Error(
        'Gemini API response has no parts in the first candidate content',
      )
    }

    const firstPart = parts[0]
    if (!firstPart) {
      throw new Error(
        'Gemini API response missing text in the first content part',
      )
    }
    const text = firstPart['text'] as string | undefined
    if (text === undefined) {
      throw new Error(
        'Gemini API response missing text in the first content part',
      )
    }

    return text
  }

  private parseFactors(parsed: Record<string, unknown>): AiScoringFactor[] {
    const raw = parsed['factors'] as Array<unknown> | undefined
    if (!raw) return []

    return raw.map((item) => {
      const f = item as Record<string, unknown>
      return {
        name: (f['name'] as string) ?? '',
        score: (f['score'] as number) ?? 0,
        weight: (f['weight'] as number) ?? 0,
        description: (f['description'] as string) ?? '',
      }
    })
  }
}

// --------------------------------------------------------------------------
// Custom API Adapter
// --------------------------------------------------------------------------

/**
 * Custom API AI adapter that calls a user-defined moderation endpoint.
 *
 * This adapter allows users to integrate their own AI moderation service
 * by providing an API endpoint URL. The expected response format is:
 *
 * ```json
 * {
 *   "score": 0-100,
 *   "confidence": 0-1,
 *   "reason": "string",
 *   "factors": [{ "name": "string", "score": 0, "weight": 0, "description": "string" }],
 *   "language": "en",
 *   "languageName": "English",
 *   "sentiment": "positive" | "neutral" | "negative",
 *   "toxicityScore": 0-1,
 *   "isToxic": false,
 *   "toxicCategories": []
 * }
 * ```
 */
class CustomAiAdapter implements AiProviderAdapter {
  readonly name = 'custom'
  private readonly apiEndpoint: string
  private readonly apiKey: string
  private readonly model: string
  private readonly maxContentLength: number
  private readonly timeoutMs: number

  constructor(config: AiEngineConfig) {
    this.apiEndpoint = config.apiEndpoint || ''
    this.apiKey = config.apiKey || ''
    this.model = config.model || ''
    this.maxContentLength = config.maxContentLength || 10000
    this.timeoutMs = config.timeoutMs || 10000
  }

  isConfigured(): boolean {
    return !!this.apiEndpoint
  }

  async classifySpam(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AiSpamScore> {
    const body = this.buildRequestBody(content, 'spam', context)
    const data = await this.callApi(body)

    return {
      score: (data['score'] as number) ?? 0,
      confidence: (data['confidence'] as number) ?? 0,
      reason: (data['reason'] as string) ?? 'Classified by custom API',
      factors: this.parseFactors(data),
    }
  }

  async detectLanguage(content: string): Promise<LanguageDetection> {
    const body = this.buildRequestBody(content, 'language')
    const data = await this.callApi(body)

    return {
      language: (data['language'] as string) ?? 'unknown',
      confidence: (data['confidence'] as number) ?? 0,
      languageName: (data['languageName'] as string) ?? 'Unknown',
    }
  }

  async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    const body = this.buildRequestBody(content, 'sentiment')
    const data = await this.callApi(body)

    const toxicCategories = (
      (data['toxicCategories'] as Array<unknown>) ?? []
    ).map((c) => String(c))

    return {
      sentiment:
        (data['sentiment'] as SentimentAnalysis['sentiment']) ?? 'neutral',
      score: (data['sentiment'] as number) ?? 0,
      confidence: (data['confidence'] as number) ?? 0,
      toxicityScore: (data['toxicityScore'] as number) ?? 0,
      isToxic: (data['isToxic'] as boolean) ?? false,
      toxicCategories,
    }
  }

  async moderateImage(imageUrl: string): Promise<ImageModerationResult> {
    const body = this.buildRequestBody(imageUrl, 'image')
    const data = await this.callApi(body)

    const rawCategories = (data['categories'] as Array<unknown>) ?? []
    const categories: ImageModerationCategory[] = rawCategories.map(
      (item: unknown) => {
        const c = item as Record<string, unknown>
        return {
          name: (c['name'] as string) ?? '',
          score: (c['score'] as number) ?? 0,
          confidence: (c['confidence'] as number) ?? 0,
        }
      },
    )

    return {
      isSafe: (data['isSafe'] as boolean) ?? true,
      confidence: (data['confidence'] as number) ?? 0,
      categories,
      suggestedAction:
        (data['suggestedAction'] as ImageModerationResult['suggestedAction']) ??
        'approve',
    }
  }

  async moderateContent(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AiModerationResult> {
    const startTime = Date.now()
    const id = generateId()
    const preview = content.slice(0, 200)

    const body = this.buildRequestBody(content, 'full', context)
    const data = await this.callApi(body)

    const spamScore = {
      score: (data['score'] as number) ?? 0,
      confidence: (data['confidence'] as number) ?? 0,
      reason: (data['reason'] as string) ?? '',
      factors: this.parseFactors(data),
    }

    const language: LanguageDetection = {
      language: (data['language'] as string) ?? 'unknown',
      confidence: (data['confidence'] as number) ?? 0,
      languageName: (data['languageName'] as string) ?? 'Unknown',
    }

    const sentiment: SentimentAnalysis = {
      sentiment:
        (data['sentiment'] as SentimentAnalysis['sentiment']) ?? 'neutral',
      score: (data['score'] as number) ?? 0,
      confidence: (data['confidence'] as number) ?? 0,
      toxicityScore: (data['toxicityScore'] as number) ?? 0,
      isToxic: (data['isToxic'] as boolean) ?? false,
      toxicCategories: ((data['toxicCategories'] as Array<unknown>) ?? []).map(
        (c) => String(c),
      ),
    }

    let recommendedAction: AiModerationResult['recommendedAction'] = 'approve'
    if (spamScore.score > 80) {
      recommendedAction = 'discard'
    } else if (spamScore.score > 50) {
      recommendedAction = 'flag'
    }

    return {
      id,
      spamScore,
      language,
      sentiment,
      recommendedAction,
      contentPreview: preview,
      analyzedAt: new Date().toISOString(),
      engine: this.name,
      processingTimeMs: Date.now() - startTime,
    }
  }

  async learnFromFeedback(
    _content: string,
    _moderatorAction: string,
    _aiAction: string,
  ): Promise<void> {
    // Feedback learning not supported for custom adapter
  }

  /** Build a standardized request body. */
  private buildRequestBody(
    content: string,
    analysisType: string,
    context?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      content: content.slice(0, this.maxContentLength),
      type: analysisType,
      model: this.model,
      ...(context ?? {}),
    }
  }

  /** Call the configured custom API endpoint. */
  private async callApi(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Custom API returned ${response.status}: ${errorText.slice(0, 200)}`,
        )
      }

      return (await response.json()) as Record<string, unknown>
    } catch (err) {
      clearTimeout(timeoutId)
      const message =
        err instanceof Error ? err.message : 'Custom API request failed'
      throw new Error(`Custom AI adapter error: ${message}`)
    }
  }

  /** Parse scoring factors from the API response. */
  private parseFactors(data: Record<string, unknown>): AiScoringFactor[] {
    const raw = data['factors'] as Array<unknown> | undefined
    if (!raw) return []

    return raw.map((item) => {
      const f = item as Record<string, unknown>
      return {
        name: (f['name'] as string) ?? '',
        score: (f['score'] as number) ?? 0,
        weight: (f['weight'] as number) ?? 0,
        description: (f['description'] as string) ?? '',
      }
    })
  }
}

// --------------------------------------------------------------------------
// AI Provider Factory
// --------------------------------------------------------------------------

/**
 * Creates the appropriate AI provider adapter based on the detection engine.
 *
 * @param engine - The AI detection engine to use.
 * @param config - Configuration for the AI engine.
 * @returns An initialized AI provider adapter.
 * @throws If the engine is `'none'` or not yet implemented.
 */
export function createAiAdapter(
  engine: AiDetectionEngine,
  config: AiEngineConfig,
): AiProviderAdapter {
  switch (engine) {
    case 'none':
      throw new Error(
        'AI moderation is disabled (engine: "none"). Provide a valid engine type.',
      )
    case 'local':
      return new LocalAiAdapter()
    case 'openai':
      return new OpenAiAdapter(config)
    case 'claude':
      return new ClaudeAdapter(config)
    case 'gemini':
      return new GeminiAdapter(config)
    case 'custom':
      return new CustomAiAdapter(config)
  }
}

// --------------------------------------------------------------------------
// Model Registry — Dynamically fetches model lists from provider APIs
// --------------------------------------------------------------------------

export {
  fetchAvailableModels,
  getDefaultModelId,
  isModelCompatible,
  clearModelCache,
  getFallbackModelIds,
} from './model-registry'

export type {
  AiModelInfo,
  AiModelCapability,
  AiModelProvider,
} from './model-registry'

export {
  getSpamKeywords,
  getProfanityList,
  getPositiveWords,
  getNegativeWords,
  getFallbackSpamKeywords,
  getFallbackProfanityList,
  getFallbackPositiveWords,
  getFallbackNegativeWords,
  clearKeywordCache,
  containsProfanity,
} from './keyword-registry'

export type { KeywordEntry } from './keyword-registry'
