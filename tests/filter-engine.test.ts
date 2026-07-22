/**
 * Unit tests for the filtering engine.
 */

import { KeywordTrie, IdSet } from '../src/utils/trie';

describe('KeywordTrie', () => {
  let trie: KeywordTrie;

  beforeEach(() => {
    trie = new KeywordTrie();
  });

  test('should insert and search keywords', () => {
    trie.insert('cocomelon', { category: 'nursery', enabled: true, builtin: true });
    trie.insert('baby shark', { category: 'nursery', enabled: true, builtin: true });
    trie.insert('skibidi', { category: 'memeCulture', enabled: true, builtin: true });

    expect(trie.getSize()).toBe(3);

    const result1 = trie.search('cocomelon');
    expect(result1).not.toBeNull();
    expect(result1!.category).toBe('nursery');

    const result2 = trie.search('nonexistent');
    expect(result2).toBeNull();
  });

  test('should find matches within text', () => {
    trie.insert('cocomelon', { category: 'nursery', enabled: true, builtin: true });
    trie.insert('baby shark', { category: 'nursery', enabled: true, builtin: true });

    const match = trie.findMatch('Watch cocomelon videos!');
    expect(match).not.toBeNull();
    expect(match!.keyword).toBe('cocomelon');
  });

  test('should find multiple matches', () => {
    trie.insert('cocomelon', { category: 'nursery', enabled: true, builtin: true });
    trie.insert('baby', { category: 'nursery', enabled: true, builtin: true });

    const matches = trie.findAllMatches('Watch cocomelon baby videos!');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('should remove keywords', () => {
    trie.insert('cocomelon', { category: 'nursery', enabled: true, builtin: true });
    expect(trie.getSize()).toBe(1);

    const removed = trie.remove('cocomelon');
    expect(removed).toBe(true);
    expect(trie.getSize()).toBe(0);

    const result = trie.search('cocomelon');
    expect(result).toBeNull();
  });

  test('should clear all keywords', () => {
    trie.insert('a', { category: 'test', enabled: true, builtin: true });
    trie.insert('b', { category: 'test', enabled: true, builtin: true });
    trie.insert('c', { category: 'test', enabled: true, builtin: true });
    expect(trie.getSize()).toBe(3);

    trie.clear();
    expect(trie.getSize()).toBe(0);
  });

  test('should be case insensitive', () => {
    trie.insert('CoComElOn', { category: 'nursery', enabled: true, builtin: true });

    expect(trie.search('cocomelon')).not.toBeNull();
    expect(trie.findMatch('COCOMELON')).not.toBeNull();
    expect(trie.findMatch('cocomelon')).not.toBeNull();
  });

  test('should build from keyword array', () => {
    const keywords = [
      { keyword: 'cocomelon', category: 'nursery', enabled: true, builtin: true },
      { keyword: 'baby shark', category: 'nursery', enabled: true, builtin: true },
    ];

    const newTrie = KeywordTrie.fromKeywords(keywords);
    expect(newTrie.getSize()).toBe(2);
    expect(newTrie.search('cocomelon')).not.toBeNull();
  });
});

describe('IdSet', () => {
  let set: IdSet;

  beforeEach(() => {
    set = new IdSet();
  });

  test('should add and check IDs', () => {
    set.add('UC1234567890123456789012', { name: 'Test Channel', category: 'test', enabled: true, builtin: true });

    expect(set.has('UC1234567890123456789012')).toBe(true);
    expect(set.has('nonexistent')).toBe(false);
  });

  test('should retrieve metadata', () => {
    set.add('UCabc', { name: 'My Channel', category: 'nursery', enabled: true, builtin: true });

    const data = set.get('UCabc');
    expect(data).not.toBeUndefined();
    expect(data!.name).toBe('My Channel');
    expect(data!.category).toBe('nursery');
  });

  test('should delete IDs', () => {
    set.add('UCtest', { name: 'Test', category: 'test', enabled: true, builtin: true });
    expect(set.has('UCtest')).toBe(true);

    set.delete('UCtest');
    expect(set.has('UCtest')).toBe(false);
    expect(set.getSize()).toBe(0);
  });

  test('should return all values', () => {
    set.add('UC1', { name: 'One', category: 'a', enabled: true, builtin: true });
    set.add('UC2', { name: 'Two', category: 'b', enabled: true, builtin: true });

    const values = set.values();
    expect(values.length).toBe(2);
  });

  test('should clear all', () => {
    set.add('UC1', { name: 'One', category: 'a', enabled: true, builtin: true });
    set.clear();
    expect(set.getSize()).toBe(0);
  });
});
