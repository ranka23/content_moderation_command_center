/**
 * CMCC Keyword Registry
 *
 * Central registry for spam detection keywords and profanity lists.
 * Previously hardcoded as static arrays in LocalAiAdapter.
 *
 * Supports fetching updated keyword lists from a remote API so new
 * spam patterns can be deployed without code changes. Falls back to
 * a built-in list when the API is unreachable.
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

/**
 * A keyword entry used for spam detection.
 */
export interface KeywordEntry {
  /** The keyword or phrase to match */
  term: string
  /** Severity weight (0-1) */
  weight: number
  /** Optional category (e.g., 'spam', 'profanity', 'violence') */
  category?: string
}

// --------------------------------------------------------------------------
// Fallback keyword lists
// --------------------------------------------------------------------------
// These are only used when the remote API is unreachable. The primary
// path fetches the latest list from the configured API endpoint.

const FALLBACK_SPAM_KEYWORDS: readonly string[] = [
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

const FALLBACK_PROFANITY_LIST: readonly string[] = [
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

const FALLBACK_POSITIVE_WORDS: readonly string[] = [
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

const FALLBACK_NEGATIVE_WORDS: readonly string[] = [
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

// --------------------------------------------------------------------------
// Cache
// --------------------------------------------------------------------------

interface CacheEntry {
  keywords: string[]
  fetchedAt: number
}

const CACHE_TTL_MS = 300_000 // 5 minutes
const cache: Map<string, CacheEntry> = new Map()

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Get the current spam keyword list.
 *
 * Tries to fetch from the remote API first, then falls back to
 * the built-in list. Results are cached in-memory for 5 minutes.
 *
 * @param apiEndpoint - Optional API endpoint for remote keyword list.
 * @returns Array of spam keyword strings.
 */
export async function getSpamKeywords(
  apiEndpoint?: string,
): Promise<readonly string[]> {
  if (apiEndpoint) {
    try {
      const cached = cache.get('spam')
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.keywords
      }

      const response = await fetch(
        `${apiEndpoint.replace(/\/+$/, '')}/keywords/spam`,
        {
          signal: AbortSignal.timeout(5_000),
        },
      )

      if (response.ok) {
        const data = (await response.json()) as {
          keywords?: string[]
          data?: string[]
        }
        const keywords = data.keywords ?? data.data ?? []
        if (keywords.length > 0) {
          cache.set('spam', { keywords, fetchedAt: Date.now() })
          return keywords
        }
      }
    } catch {
      // API unreachable — fall through to built-in
    }
  }

  return FALLBACK_SPAM_KEYWORDS
}

/**
 * Get the current profanity list.
 *
 * @param apiEndpoint - Optional API endpoint for remote keyword list.
 * @returns Array of profanity word strings.
 */
export async function getProfanityList(
  apiEndpoint?: string,
): Promise<readonly string[]> {
  if (apiEndpoint) {
    try {
      const cached = cache.get('profanity')
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.keywords
      }

      const response = await fetch(
        `${apiEndpoint.replace(/\/+$/, '')}/keywords/profanity`,
        { signal: AbortSignal.timeout(5_000) },
      )

      if (response.ok) {
        const data = (await response.json()) as {
          keywords?: string[]
          data?: string[]
        }
        const keywords = data.keywords ?? data.data ?? []
        if (keywords.length > 0) {
          cache.set('profanity', { keywords, fetchedAt: Date.now() })
          return keywords
        }
      }
    } catch {
      // API unreachable — fall through to built-in
    }
  }

  return FALLBACK_PROFANITY_LIST
}

/**
 * Get the current positive sentiment word list.
 *
 * Tries to fetch from the remote API first, then falls back to
 * the built-in list. Results are cached in-memory for 5 minutes.
 *
 * @param apiEndpoint - Optional API endpoint for remote keyword list.
 * @returns Array of positive word strings.
 */
export async function getPositiveWords(
  apiEndpoint?: string,
): Promise<readonly string[]> {
  if (apiEndpoint) {
    try {
      const cached = cache.get('positive')
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.keywords
      }

      const response = await fetch(
        `${apiEndpoint.replace(/\/+$/, '')}/keywords/positive`,
        { signal: AbortSignal.timeout(5_000) },
      )

      if (response.ok) {
        const data = (await response.json()) as {
          keywords?: string[]
          data?: string[]
        }
        const keywords = data.keywords ?? data.data ?? []
        if (keywords.length > 0) {
          cache.set('positive', { keywords, fetchedAt: Date.now() })
          return keywords
        }
      }
    } catch {
      // API unreachable — fall through to built-in
    }
  }

  return FALLBACK_POSITIVE_WORDS
}

/**
 * Get the current negative sentiment word list.
 *
 * Tries to fetch from the remote API first, then falls back to
 * the built-in list. Results are cached in-memory for 5 minutes.
 *
 * @param apiEndpoint - Optional API endpoint for remote keyword list.
 * @returns Array of negative word strings.
 */
export async function getNegativeWords(
  apiEndpoint?: string,
): Promise<readonly string[]> {
  if (apiEndpoint) {
    try {
      const cached = cache.get('negative')
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.keywords
      }

      const response = await fetch(
        `${apiEndpoint.replace(/\/+$/, '')}/keywords/negative`,
        { signal: AbortSignal.timeout(5_000) },
      )

      if (response.ok) {
        const data = (await response.json()) as {
          keywords?: string[]
          data?: string[]
        }
        const keywords = data.keywords ?? data.data ?? []
        if (keywords.length > 0) {
          cache.set('negative', { keywords, fetchedAt: Date.now() })
          return keywords
        }
      }
    } catch {
      // API unreachable — fall through to built-in
    }
  }

  return FALLBACK_NEGATIVE_WORDS
}

/**
 * Synchronous fallback — returns the built-in spam keyword list
 * without any network call. Useful for initial render.
 */
export function getFallbackSpamKeywords(): readonly string[] {
  return FALLBACK_SPAM_KEYWORDS
}

/**
 * Synchronous fallback — returns the built-in profanity list.
 */
export function getFallbackProfanityList(): readonly string[] {
  return FALLBACK_PROFANITY_LIST
}

/**
 * Synchronous fallback — returns the built-in positive word list.
 */
export function getFallbackPositiveWords(): readonly string[] {
  return FALLBACK_POSITIVE_WORDS
}

/**
 * Synchronous fallback — returns the built-in negative word list.
 */
export function getFallbackNegativeWords(): readonly string[] {
  return FALLBACK_NEGATIVE_WORDS
}

/**
 * Clear the keyword cache.
 */
export function clearKeywordCache(): void {
  cache.clear()
}

/**
 * Check if text contains any profanity words.
 *
 * Performs a word-boundary check against the built-in profanity list
 * synchronously. For a full remote-backed check, use getProfanityList()
 * first and then match manually.
 *
 * @param text - The text to check.
 * @returns Whether profanity was detected.
 */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return FALLBACK_PROFANITY_LIST.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lower)
  })
}
