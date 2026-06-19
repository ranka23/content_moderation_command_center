/**
 * Unit tests for CMCC Configuration Registries
 */

import {
  getPlatforms,
  getPlatform,
  getFirstPartyPlatforms,
  getPlatformIds,
  getModerationActions,
  getAiEngineOptions,
  getThemeOptions,
  getTimezoneOptions,
  getLocaleOptions,
  getIntegrationProviders,
  getModeratorRoleOptions,
} from '../index'

describe('Platform Registry', () => {
  it('getPlatforms returns all 5 platforms', () => {
    const platforms = getPlatforms()
    expect(platforms).toHaveLength(5)
    const ids = platforms.map((p) => p.id).sort()
    expect(ids).toEqual(['shopify', 'storyblok', 'strapi', 'wix', 'wordpress'])
  })

  it('getPlatform returns a platform by id', () => {
    const wp = getPlatform('wordpress')
    expect(wp).toBeDefined()
    expect(wp!.name).toBe('WordPress')
    expect(wp!.icon).toBe('wordpress')
    expect(wp!.isFirstParty).toBe(true)
  })

  it('getPlatform returns undefined for unknown id', () => {
    const result = getPlatform('unknown' as never)
    expect(result).toBeUndefined()
  })

  it('getFirstPartyPlatforms returns all platforms', () => {
    const fps = getFirstPartyPlatforms()
    expect(fps).toHaveLength(5)
  })

  it('getPlatformIds returns all 5 ids', () => {
    const ids = getPlatformIds()
    expect(ids).toHaveLength(5)
  })
})

describe('Options Registry', () => {
  it('getModerationActions returns 5 actions', () => {
    const actions = getModerationActions()
    expect(actions).toHaveLength(5)
    expect(actions[0]!.value).toBe('approve')
  })

  it('getAiEngineOptions includes local, openai, claude, gemini', () => {
    const engines = getAiEngineOptions()
    const values = engines.map((e) => e.value)
    expect(values).toContain('local')
    expect(values).toContain('openai')
    expect(values).toContain('claude')
    expect(values).toContain('gemini')
    expect(values).toContain('none')
  })

  it('getThemeOptions returns light, dark, system', () => {
    const themes = getThemeOptions()
    expect(themes).toHaveLength(3)
    expect(themes.map((t) => t.value)).toEqual(['light', 'dark', 'system'])
  })

  it('getTimezoneOptions returns valid timezone strings', () => {
    const zones = getTimezoneOptions()
    expect(zones.length).toBeGreaterThan(10)
    // 'UTC' may not always be in the list depending on the runtime;
    // check that at least some known timezones are present
    const hasKnownTimezone =
      zones.some((z) => z.value === 'UTC') ||
      zones.some((z) => z.value.includes('America')) ||
      zones.some((z) => z.value.includes('Europe')) ||
      zones.some((z) => z.value.includes('Asia'))
    expect(hasKnownTimezone).toBe(true)
  })

  it('getLocaleOptions returns locale options', () => {
    const locales = getLocaleOptions()
    expect(locales.length).toBeGreaterThan(5)
    expect(locales.some((l) => l.value === 'en-US')).toBe(true)
  })

  it('getIntegrationProviders includes slack, discord, email', () => {
    const providers = getIntegrationProviders()
    const values = providers.map((p) => p.value)
    expect(values).toContain('slack')
    expect(values).toContain('discord')
    expect(values).toContain('email')
    expect(values).toContain('webhook')
    expect(values).toContain('pagerduty')
  })

  it('getModeratorRoleOptions returns 3 roles', () => {
    const roles = getModeratorRoleOptions()
    expect(roles).toHaveLength(3)
    expect(roles.map((r) => r.value)).toEqual(['admin', 'moderator', 'viewer'])
  })
})
