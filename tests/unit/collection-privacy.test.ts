import { describe, expect, it } from 'vitest';
import {
  computeEffectiveVisibility,
  getCollectionGlobalVisibilityLabel,
  getCollectionVisibilityLabel,
  isGlobalVisibilityMoreRestrictive,
  normalizeCollectionVisibility,
} from '@/lib/collection-privacy';

describe('collection-privacy helpers', () => {
  it('normalizes known and legacy visibility values', () => {
    expect(normalizeCollectionVisibility('public')).toBe('public');
    expect(normalizeCollectionVisibility('friends')).toBe('friends');
    expect(normalizeCollectionVisibility('private')).toBe('private');
    expect(normalizeCollectionVisibility('unlisted')).toBe('public');
    expect(normalizeCollectionVisibility(undefined)).toBe('public');
    expect(normalizeCollectionVisibility(null)).toBe('public');
  });

  it('computes effective visibility using the global ceiling rule', () => {
    expect(computeEffectiveVisibility('public', 'public')).toBe('public');
    expect(computeEffectiveVisibility('public', 'friends')).toBe('friends');
    expect(computeEffectiveVisibility('public', 'private')).toBe('private');
    expect(computeEffectiveVisibility('friends', 'public')).toBe('friends');
    expect(computeEffectiveVisibility('friends', 'private')).toBe('private');
    expect(computeEffectiveVisibility('private', 'public')).toBe('private');
    expect(computeEffectiveVisibility('private', 'friends')).toBe('private');
  });

  it('detects when global visibility is stricter than collection privacy', () => {
    expect(isGlobalVisibilityMoreRestrictive('private', 'public')).toBe(true);
    expect(isGlobalVisibilityMoreRestrictive('private', 'friends')).toBe(true);
    expect(isGlobalVisibilityMoreRestrictive('friends', 'public')).toBe(true);

    expect(isGlobalVisibilityMoreRestrictive('private', 'private')).toBe(false);
    expect(isGlobalVisibilityMoreRestrictive('friends', 'friends')).toBe(false);
    expect(isGlobalVisibilityMoreRestrictive('friends', 'private')).toBe(false);
    expect(isGlobalVisibilityMoreRestrictive('public', 'public')).toBe(false);
  });

  it('returns PT-BR labels for individual and global visibilities', () => {
    expect(getCollectionVisibilityLabel('public')).toBe('Público');
    expect(getCollectionVisibilityLabel('friends')).toBe('Somente Amigos');
    expect(getCollectionVisibilityLabel('private')).toBe('Somente Eu');
    expect(getCollectionGlobalVisibilityLabel('private')).toBe('Somente Eu (Ninguém)');
  });
});
