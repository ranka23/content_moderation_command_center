// ---------------------------------------------------------------------------
// Unit tests for CMCC AI adapters
// ---------------------------------------------------------------------------
import {
  createAiAdapter,
  OpenAiAdapter,
  ClaudeAdapter,
  GeminiAdapter,
  LocalAiAdapter,
} from '../ai/index'
import {
  getFallbackModelIds,
  isModelCompatible,
  clearModelCache,
} from '../ai/model-registry'
import type {
  AiEngineConfig,
  AiSpamScore,
  LanguageDetection,
  SentimentAnalysis,
} from '../ai/index'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const mockFetch = jest.fn()
global.fetch = mockFetch

function createMockResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'application/json' }),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  } as unknown as Response
}

/** Default OpenAI chat-completion mock that always returns the given content string. */
function openAiChatResponse(content: string): Record<string, unknown> {
  return {
    choices: [{ message: { content } }],
    usage: { total_tokens: 50 },
  }
}

/** Default Claude messages mock response. */
function claudeMessagesResponse(text: string): Record<string, unknown> {
  return {
    content: [{ type: 'text', text }],
    id: 'msg_123',
    model: 'claude-sonnet-4-20250514',
    role: 'assistant',
  }
}

/** Default Gemini generateContent mock response. */
function geminiGenerateResponse(text: string): Record<string, unknown> {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
          role: 'model',
        },
        finishReason: 'STOP',
      },
    ],
  }
}

/**
 * Create a canned `AiSpamScore` to use as a mock-return value.
 */
const defaultSpamScore: AiSpamScore = {
  score: 10,
  confidence: 0.95,
  reason: 'Content appears legitimate',
  factors: [{ name: 'test', score: 10, weight: 1, description: 'Test factor' }],
}

const defaultLanguage: LanguageDetection = {
  language: 'en',
  confidence: 0.98,
  languageName: 'English',
}

const defaultSentiment: SentimentAnalysis = {
  sentiment: 'positive',
  score: 0.75,
  confidence: 0.9,
  toxicityScore: 0.02,
  isToxic: false,
  toxicCategories: [],
}

// ---------------------------------------------------------------------------
// Factory wiring
// ---------------------------------------------------------------------------

describe('Factory wiring', () => {
  const baseConfig: AiEngineConfig = {
    engine: 'openai',
    apiKey: 'sk-test',
    model: 'gpt-4o',
  }

  it('createAiAdapter returns OpenAiAdapter for openai engine', () => {
    const adapter = createAiAdapter('openai', baseConfig)
    expect(adapter).toBeInstanceOf(OpenAiAdapter)
    expect(adapter.constructor.name).toBe('OpenAiAdapter')
  })

  it('createAiAdapter returns ClaudeAdapter for claude engine', () => {
    const adapter = createAiAdapter('claude', baseConfig)
    expect(adapter).toBeInstanceOf(ClaudeAdapter)
    expect(adapter.constructor.name).toBe('ClaudeAdapter')
  })

  it('createAiAdapter returns GeminiAdapter for gemini engine', () => {
    const adapter = createAiAdapter('gemini', baseConfig)
    expect(adapter).toBeInstanceOf(GeminiAdapter)
    expect(adapter.constructor.name).toBe('GeminiAdapter')
  })

  it('createAiAdapter returns LocalAiAdapter for local engine', () => {
    const adapter = createAiAdapter('local', baseConfig)
    expect(adapter).toBeInstanceOf(LocalAiAdapter)
    expect(adapter.constructor.name).toBe('LocalAiAdapter')
  })

  it('createAiAdapter throws for none engine', () => {
    expect(() => createAiAdapter('none', baseConfig)).toThrow(
      /AI moderation is disabled/i,
    )
  })

  it('createAiAdapter returns adapter for custom engine', () => {
    const adapter = createAiAdapter('custom', baseConfig)
    expect(adapter.isConfigured()).toBeDefined()
    expect(adapter.name).toBe('custom')
  })

  it('all adapters implement AiProviderAdapter interface', () => {
    const openai = createAiAdapter('openai', baseConfig)
    const claude = createAiAdapter('claude', baseConfig)
    const gemini = createAiAdapter('gemini', baseConfig)
    const local = createAiAdapter('local', baseConfig)

    const adapters = [openai, claude, gemini, local]
    for (const adapter of adapters) {
      expect(adapter).toHaveProperty('name')
      expect(adapter).toHaveProperty('isConfigured')
      expect(adapter).toHaveProperty('classifySpam')
      expect(adapter).toHaveProperty('detectLanguage')
      expect(adapter).toHaveProperty('analyzeSentiment')
      expect(adapter).toHaveProperty('moderateImage')
      expect(adapter).toHaveProperty('moderateContent')
      expect(adapter).toHaveProperty('learnFromFeedback')
      expect(typeof adapter.isConfigured).toBe('function')
      expect(typeof adapter.classifySpam).toBe('function')
      expect(typeof adapter.detectLanguage).toBe('function')
      expect(typeof adapter.analyzeSentiment).toBe('function')
      expect(typeof adapter.moderateImage).toBe('function')
      expect(typeof adapter.moderateContent).toBe('function')
      expect(typeof adapter.learnFromFeedback).toBe('function')
    }
  })
})

// ---------------------------------------------------------------------------
// OpenAiAdapter
// ---------------------------------------------------------------------------

describe('OpenAiAdapter', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('construction', () => {
    it('throws without API key', () => {
      expect(
        () => new OpenAiAdapter({ engine: 'openai' } as AiEngineConfig),
      ).toThrow(/requires an API key/i)
    })

    it('throws without model', () => {
      expect(
        () =>
          new OpenAiAdapter({
            engine: 'openai',
            apiKey: 'sk-test',
          } as AiEngineConfig),
      ).toThrow(/requires a model/i)
    })

    it('uses provided config values', () => {
      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4o-mini',
        maxContentLength: 2000,
        timeoutMs: 15000,
        apiEndpoint: 'https://custom.example.com/v1',
      })

      // We cannot access private fields directly, but we can observe their
      // behaviour through public methods.
      expect(adapter.name).toBe('openai')
      expect(adapter.isConfigured()).toBe(true)
    })

    it('uses sensible defaults when optional config is omitted', () => {
      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-defaults',
        model: 'gpt-4o',
      })
      expect(adapter.isConfigured()).toBe(true)
    })
  })

  describe('properties', () => {
    it('isConfigured returns true when apiKey is set', () => {
      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-valid',
        model: 'gpt-4o',
      })
      expect(adapter.isConfigured()).toBe(true)
    })

    it('isConfigured returns false when apiKey is empty string (constructor still throws)', () => {
      // The constructor uses `if (!config.apiKey)`, and empty string is falsy,
      // so it throws before isConfigured can be reached.
      expect(
        () =>
          new OpenAiAdapter({
            engine: 'openai',
            apiKey: '',
            model: 'gpt-4o',
          } as AiEngineConfig),
      ).toThrow()
    })

    it('name returns openai', () => {
      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      })
      expect(adapter.name).toBe('openai')
    })
  })

  describe('API calls', () => {
    it('classifySpam calls the chat completions endpoint', async () => {
      const spamJson = JSON.stringify({
        score: 85,
        confidence: 0.92,
        reason: 'Multiple spam indicators',
        factors: [
          {
            name: 'keyword',
            score: 80,
            weight: 0.5,
            description: 'Spam keywords found',
          },
        ],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(openAiChatResponse(spamJson)),
      )

      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      })
      const result = await adapter.classifySpam('Buy now! Limited offer!', {
        source: 'contact-form',
      })

      // Verify the fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/\/chat\/completions$/)
      expect(opts.method).toBe('POST')
      expect(opts.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-test',
      })

      // Verify parsed result
      expect(result.score).toBe(85)
      expect(result.confidence).toBe(0.92)
      expect(result.reason).toContain('spam')
      expect(result.factors).toHaveLength(1)
    })

    it('detectLanguage calls the chat completions endpoint', async () => {
      const langJson = JSON.stringify({
        language: 'fr',
        confidence: 0.96,
        languageName: 'French',
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(openAiChatResponse(langJson)),
      )

      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      })
      const result = await adapter.detectLanguage('Bonjour le monde')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/\/chat\/completions$/)

      expect(result.language).toBe('fr')
      expect(result.confidence).toBe(0.96)
      expect(result.languageName).toBe('French')
    })

    it('analyzeSentiment calls the chat completions endpoint', async () => {
      const sentimentJson = JSON.stringify({
        sentiment: 'negative',
        score: -0.62,
        confidence: 0.88,
        toxicityScore: 0.45,
        isToxic: true,
        toxicCategories: ['hateful_language'],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(openAiChatResponse(sentimentJson)),
      )

      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      })
      const result = await adapter.analyzeSentiment(
        'I hate this terrible product',
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/\/chat\/completions$/)

      expect(result.sentiment).toBe('negative')
      expect(result.score).toBe(-0.62)
      expect(result.isToxic).toBe(true)
      expect(result.toxicCategories).toContain('hateful_language')
    })

    it('moderateImage uses vision model', async () => {
      const imageJson = JSON.stringify({
        isSafe: false,
        confidence: 0.89,
        categories: [{ name: 'violence', score: 0.72, confidence: 0.85 }],
        suggestedAction: 'flag',
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(openAiChatResponse(imageJson)),
      )

      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      })
      const result = await adapter.moderateImage('https://example.com/img.jpg')

      // Verify it called the chat completions endpoint with an image_url block
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(opts.body as string)
      const content = body.messages[0].content
      expect(content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'image_url' }),
        ]),
      )

      expect(result.isSafe).toBe(false)
      expect(result.suggestedAction).toBe('flag')
      expect(result.categories).toHaveLength(1)
      expect(result.categories[0]).toBeDefined()
      expect(result.categories[0]!.name).toBe('violence')
    })

    it('moderateContent combines results from sub-analyses', async () => {
      const adapter = new OpenAiAdapter({
        engine: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      })

      // Spy on the three sub-methods so we control their return values
      // without triggering real fetch calls.
      jest.spyOn(adapter, 'classifySpam').mockResolvedValue(defaultSpamScore)
      jest.spyOn(adapter, 'detectLanguage').mockResolvedValue(defaultLanguage)
      jest
        .spyOn(adapter, 'analyzeSentiment')
        .mockResolvedValue(defaultSentiment)
      const moderateImageSpy = jest
        .spyOn(adapter, 'moderateImage')
        .mockResolvedValue({
          isSafe: true,
          confidence: 0.5,
          categories: [],
          suggestedAction: 'approve',
        })

      const result = await adapter.moderateContent('Hello world', {
        imageUrl: 'https://example.com/photo.png',
        context: { userId: '123' },
      })

      expect(adapter.classifySpam).toHaveBeenCalledWith('Hello world', {
        userId: '123',
      })
      expect(adapter.detectLanguage).toHaveBeenCalledWith('Hello world')
      expect(adapter.analyzeSentiment).toHaveBeenCalledWith('Hello world')
      expect(moderateImageSpy).toHaveBeenCalledWith(
        'https://example.com/photo.png',
      )

      expect(result.spamScore).toBe(defaultSpamScore)
      expect(result.language).toBe(defaultLanguage)
      expect(result.sentiment).toBe(defaultSentiment)
      expect(result.imageModeration?.isSafe).toBe(true)
      expect(result.engine).toBe('openai')
      expect(result.contentPreview).toBeDefined()
      expect(result.id).toMatch(/^mod_/)
      expect(result.recommendedAction).toBe('approve')
      expect(result.analyzedAt).toBeDefined()
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
    })
  })
})

// ---------------------------------------------------------------------------
// ClaudeAdapter
// ---------------------------------------------------------------------------

describe('ClaudeAdapter', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('construction', () => {
    it('throws without API key', () => {
      expect(
        () => new ClaudeAdapter({ engine: 'claude' } as AiEngineConfig),
      ).toThrow(/requires an API key/i)
    })

    it('throws without model', () => {
      expect(
        () =>
          new ClaudeAdapter({
            engine: 'claude',
            apiKey: 'sk-ant-test',
          } as AiEngineConfig),
      ).toThrow(/requires a model/i)
    })

    it('uses provided config values', () => {
      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-test123',
        model: 'claude-sonnet-4-20250514',
        maxContentLength: 4000,
        timeoutMs: 20000,
        apiEndpoint: 'https://custom.anthropic.com/v1',
      })
      expect(adapter.name).toBe('claude')
      expect(adapter.isConfigured()).toBe(true)
    })
  })

  describe('properties', () => {
    it('name returns claude', () => {
      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-test',
        model: 'claude-sonnet-4-20250514',
      })
      expect(adapter.name).toBe('claude')
    })

    it('isConfigured returns true when apiKey is set', () => {
      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      })
      expect(adapter.isConfigured()).toBe(true)
    })
  })

  describe('API calls', () => {
    it('uses x-api-key header (not Authorization: Bearer)', async () => {
      const spamJson = JSON.stringify({
        score: 5,
        confidence: 0.99,
        reason: 'Clean content',
        factors: [],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(claudeMessagesResponse(spamJson)),
      )

      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-secret',
        model: 'claude-sonnet-4-20250514',
      })
      await adapter.classifySpam('Hello, how are you?')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = opts.headers as Record<string, string>

      // Should have x-api-key but NOT Authorization
      expect(headers['x-api-key']).toBe('sk-ant-secret')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('uses anthropic-version header', async () => {
      const spamJson = JSON.stringify({
        score: 5,
        confidence: 0.99,
        reason: 'Clean',
        factors: [],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(claudeMessagesResponse(spamJson)),
      )

      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-secret',
        model: 'claude-sonnet-4-20250514',
      })
      await adapter.classifySpam('Hello')

      const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = opts.headers as Record<string, string>
      expect(headers['anthropic-version']).toBe('2023-06-01')
    })

    it('calls /messages endpoint (not /chat/completions)', async () => {
      const spamJson = JSON.stringify({
        score: 5,
        confidence: 0.99,
        reason: 'Clean',
        factors: [],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(claudeMessagesResponse(spamJson)),
      )

      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-secret',
        model: 'claude-sonnet-4-20250514',
      })
      await adapter.classifySpam('Hello')

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/\/messages$/)
      expect(url).not.toMatch(/\/chat\/completions/)
    })

    it('parses response from content[0].text', async () => {
      const langJson = JSON.stringify({
        language: 'de',
        confidence: 0.94,
        languageName: 'German',
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(claudeMessagesResponse(langJson)),
      )

      const adapter = new ClaudeAdapter({
        engine: 'claude',
        apiKey: 'sk-ant-secret',
        model: 'claude-sonnet-4-20250514',
      })
      const result = await adapter.detectLanguage('Guten Tag')

      expect(result.language).toBe('de')
      expect(result.confidence).toBe(0.94)
      expect(result.languageName).toBe('German')
    })
  })
})

// ---------------------------------------------------------------------------
// GeminiAdapter
// ---------------------------------------------------------------------------

describe('GeminiAdapter', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('construction', () => {
    it('throws without API key', () => {
      expect(
        () => new GeminiAdapter({ engine: 'gemini' } as AiEngineConfig),
      ).toThrow(/requires an API key/i)
    })

    it('throws without model', () => {
      expect(
        () =>
          new GeminiAdapter({
            engine: 'gemini',
            apiKey: 'AIza-test',
          } as AiEngineConfig),
      ).toThrow(/requires a model/i)
    })

    it('uses provided config values', () => {
      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-test123',
        model: 'gemini-2.0-flash',
        maxContentLength: 3000,
        timeoutMs: 25000,
        apiEndpoint: 'https://custom.googleapis.com/v1beta',
      })
      expect(adapter.name).toBe('gemini')
      expect(adapter.isConfigured()).toBe(true)
    })
  })

  describe('properties', () => {
    it('name returns gemini', () => {
      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-test',
        model: 'gemini-2.0-flash',
      })
      expect(adapter.name).toBe('gemini')
    })

    it('isConfigured returns true when apiKey is set', () => {
      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-valid',
        model: 'gemini-2.0-flash',
      })
      expect(adapter.isConfigured()).toBe(true)
    })
  })

  describe('API calls', () => {
    it('uses x-goog-api-key header', async () => {
      const spamJson = JSON.stringify({
        score: 10,
        confidence: 0.95,
        reason: 'Looks fine',
        factors: [],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(geminiGenerateResponse(spamJson)),
      )

      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-my-key',
        model: 'gemini-2.0-flash',
      })
      await adapter.classifySpam('Hello world')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = opts.headers as Record<string, string>
      expect(headers['x-goog-api-key']).toBe('AIza-my-key')
    })

    it('calls :generateContent endpoint', async () => {
      const spamJson = JSON.stringify({
        score: 10,
        confidence: 0.95,
        reason: 'Clean',
        factors: [],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(geminiGenerateResponse(spamJson)),
      )

      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-key',
        model: 'gemini-2.0-flash',
      })
      await adapter.classifySpam('Test')

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toMatch(/:generateContent$/)
    })

    it('response parsed from candidates[0].content.parts[0].text', async () => {
      const sentimentJson = JSON.stringify({
        sentiment: 'positive',
        score: 0.82,
        confidence: 0.91,
        toxicityScore: 0.01,
        isToxic: false,
        toxicCategories: [],
      })
      mockFetch.mockResolvedValueOnce(
        createMockResponse(geminiGenerateResponse(sentimentJson)),
      )

      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-key',
        model: 'gemini-2.0-flash',
      })
      const result = await adapter.analyzeSentiment('What a wonderful day!')

      expect(result.sentiment).toBe('positive')
      expect(result.score).toBe(0.82)
      expect(result.confidence).toBe(0.91)
      expect(result.isToxic).toBe(false)
    })

    it('moderateImage works with the vision model', async () => {
      // Gemini moderateImage makes two fetch calls:
      //   1. Download the image
      //   2. Call the generateContent endpoint
      const imageResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        headers: new Headers({ 'content-type': 'image/png' }),
      } as unknown as Response

      const imageJson = JSON.stringify({
        isSafe: true,
        confidence: 0.97,
        categories: [],
        suggestedAction: 'approve',
      })
      const geminiResponse = createMockResponse(
        geminiGenerateResponse(imageJson),
      )

      mockFetch
        .mockResolvedValueOnce(imageResponse)
        .mockResolvedValueOnce(geminiResponse)

      const adapter = new GeminiAdapter({
        engine: 'gemini',
        apiKey: 'AIza-key',
        model: 'gemini-2.0-flash',
      })
      const result = await adapter.moderateImage(
        'https://example.com/photo.png',
      )

      // First call is image download
      const [imageUrl] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(imageUrl).toBe('https://example.com/photo.png')

      // Second call is the Gemini API
      const [geminiUrl, geminiOpts] = mockFetch.mock.calls[1] as [
        string,
        RequestInit,
      ]
      expect(geminiUrl).toMatch(/:generateContent$/)
      const body = JSON.parse(geminiOpts.body as string)
      expect(body.contents[0].parts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ inlineData: expect.any(Object) }),
        ]),
      )

      expect(result.isSafe).toBe(true)
      expect(result.suggestedAction).toBe('approve')
    })
  })
})

// ---------------------------------------------------------------------------
// LocalAiAdapter
// ---------------------------------------------------------------------------

describe('LocalAiAdapter', () => {
  it('isConfigured returns true (always configured)', () => {
    const adapter = new LocalAiAdapter()
    expect(adapter.isConfigured()).toBe(true)
  })

  it('name returns local', () => {
    const adapter = new LocalAiAdapter()
    expect(adapter.name).toBe('local')
  })

  it('can run without any config', () => {
    const adapter = new LocalAiAdapter()
    expect(adapter).toBeDefined()
    expect(adapter.isConfigured()).toBe(true)
  })

  describe('classifySpam', () => {
    it('returns a spam score for content with spam keywords', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.classifySpam(
        'Buy now! Limited offer! Click here to claim your free money! Act now! Exclusive deal! Risk free! This is not spam! Congratulations you won!',
      )
      expect(result.score).toBeGreaterThan(30)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.reason).toBeDefined()
      expect(result.factors.length).toBeGreaterThanOrEqual(1)
    })

    it('returns a low score for clean content', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.classifySpam(
        'The weather today is quite pleasant, I think I will go for a walk.',
      )
      // Clean content should have a low spam score
      expect(result.score).toBeLessThanOrEqual(30)
    })
  })

  describe('detectLanguage', () => {
    it('detects English correctly', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.detectLanguage(
        'Hello, welcome to our website. We hope you enjoy your stay.',
      )
      expect(result.language).toBe('en')
      expect(result.languageName).toBe('English')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('detects Russian (Cyrillic)', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.detectLanguage(
        'Добро пожаловать на наш сайт.',
      )
      expect(result.language).toBe('ru')
      expect(result.languageName).toBe('Russian')
    })

    it('returns English for empty text with moderate confidence', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.detectLanguage('')
      expect(result.language).toBe('en')
      expect(result.confidence).toBe(0.5)
    })
  })

  describe('analyzeSentiment', () => {
    it('returns positive sentiment for positive text', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.analyzeSentiment(
        'This is absolutely wonderful and amazing! I love it!',
      )
      expect(result.sentiment).toBe('positive')
      expect(result.score).toBeGreaterThan(0)
    })

    it('returns negative sentiment for negative text', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.analyzeSentiment(
        'This is terrible and horrible. I hate it.',
      )
      expect(result.sentiment).toBe('negative')
      expect(result.score).toBeLessThan(0)
    })

    it('returns neutral sentiment for text with no sentiment words', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.analyzeSentiment(
        'The table is near the window. The book is on the shelf.',
      )
      expect(result.sentiment).toBe('neutral')
      expect(result.score).toBe(0)
    })

    it('detects toxicity', async () => {
      const adapter = new LocalAiAdapter()
      const result = await adapter.analyzeSentiment(
        'I hate you! You are so stupid and ugly. Kill yourself.',
      )
      expect(result.isToxic).toBe(true)
      expect(result.toxicityScore).toBeGreaterThan(0)
      expect(result.toxicCategories.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ---------------------------------------------------------------------------
// ModelRegistry
// ---------------------------------------------------------------------------

describe('ModelRegistry', () => {
  describe('getFallbackModelIds', () => {
    it('returns known model IDs for openai', () => {
      const ids = getFallbackModelIds('openai')
      expect(ids).toContain('gpt-4o')
      expect(ids).toContain('gpt-4o-mini')
      expect(ids).toContain('o1-mini')
      expect(ids).toHaveLength(3)
    })

    it('returns known model IDs for claude', () => {
      const ids = getFallbackModelIds('claude')
      expect(ids).toContain('claude-sonnet-4-20250514')
      expect(ids).toContain('claude-3-5-haiku-20241022')
      expect(ids).toHaveLength(2)
    })

    it('returns known model IDs for gemini including gemini-2.0-flash', () => {
      const ids = getFallbackModelIds('gemini')
      expect(ids).toContain('gemini-2.0-flash')
      expect(ids).toContain('gemini-2.0-pro')
      expect(ids).toContain('gemini-1.5-flash')
      expect(ids).toContain('gemini-1.5-pro')
      expect(ids).toHaveLength(4)
    })
  })

  describe('isModelCompatible', () => {
    it('returns true for openai model matching gpt pattern', () => {
      expect(isModelCompatible('gpt-4o', 'openai')).toBe(true)
      expect(isModelCompatible('gpt-4o-mini', 'openai')).toBe(true)
    })

    it('returns true for openai model matching o1/o3 pattern', () => {
      expect(isModelCompatible('o1-mini', 'openai')).toBe(true)
      expect(isModelCompatible('o3-mini', 'openai')).toBe(true)
    })

    it('returns true for claude model matching claude- pattern', () => {
      expect(isModelCompatible('claude-sonnet-4-20250514', 'claude')).toBe(true)
      expect(isModelCompatible('claude-3-5-haiku-20241022', 'claude')).toBe(
        true,
      )
    })

    it('returns true for gemini model matching gemini- pattern', () => {
      expect(isModelCompatible('gemini-2.0-flash', 'gemini')).toBe(true)
      expect(isModelCompatible('gemini-1.5-pro', 'gemini')).toBe(true)
    })

    it('returns false for non-matching patterns', () => {
      expect(isModelCompatible('gpt-4o', 'claude')).toBe(false)
      expect(isModelCompatible('claude-sonnet-4-20250514', 'openai')).toBe(
        false,
      )
      expect(isModelCompatible('gemini-2.0-flash', 'openai')).toBe(false)
      expect(isModelCompatible('unknown-model', 'openai')).toBe(false)
    })
  })

  describe('clearModelCache', () => {
    it('clears the cache without throwing', () => {
      // The cache is module-scoped; we can't easily inspect it,
      // but we can verify that calling clearModelCache does not error.
      expect(() => clearModelCache()).not.toThrow()
    })

    it('can be called multiple times', () => {
      expect(() => {
        clearModelCache()
        clearModelCache()
        clearModelCache()
      }).not.toThrow()
    })
  })
})
