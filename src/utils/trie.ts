/**
 * Trie data structure for efficient keyword matching.
 * Supports fast lookups with O(k) complexity where k is keyword length.
 * Ideal for 100,000+ keyword matching without linear scans.
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  data?: KeywordData;
}

export interface KeywordData {
  keyword: string;
  category: string;
  enabled: boolean;
  builtin: boolean;
}

export class KeywordTrie {
  private root: TrieNode;
  private size: number;

  constructor() {
    this.root = { children: new Map(), isEndOfWord: false };
    this.size = 0;
  }

  /**
   * Insert a keyword into the trie
   */
  insert(keyword: string, data: Omit<KeywordData, 'keyword'>): void {
    let current = this.root;
    const lower = keyword.toLowerCase();

    for (const char of lower) {
      if (!current.children.has(char)) {
        current.children.set(char, { children: new Map(), isEndOfWord: false });
      }
      current = current.children.get(char)!;
    }

    if (!current.isEndOfWord) {
      this.size++;
    }

    current.isEndOfWord = true;
    current.data = {
      keyword,
      ...data,
    };
  }

  /**
   * Search for a keyword exactly
   */
  search(keyword: string): KeywordData | null {
    let current = this.root;
    const lower = keyword.toLowerCase();

    for (const char of lower) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord ? current.data || null : null;
  }

  /**
   * Check if any keyword in the trie matches within the given text
   * Returns the first matching keyword data, or null if no match
   */
  findMatch(text: string): KeywordData | null {
    const lower = text.toLowerCase();

    for (let i = 0; i < lower.length; i++) {
      let current = this.root;

      for (let j = i; j < lower.length; j++) {
        const char = lower[j];
        if (!current.children.has(char)) {
          break;
        }
        current = current.children.get(char)!;

        if (current.isEndOfWord && current.data) {
          // Verify word boundary if needed (keyword should be part of actual words)
          return current.data;
        }
      }
    }

    return null;
  }

  /**
   * Check if any keyword in the trie matches within the given text
   * Returns all matching keyword data
   */
  findAllMatches(text: string): KeywordData[] {
    const matches: KeywordData[] = [];
    const lower = text.toLowerCase();

    for (let i = 0; i < lower.length; i++) {
      let current = this.root;

      for (let j = i; j < lower.length; j++) {
        const char = lower[j];
        if (!current.children.has(char)) {
          break;
        }
        current = current.children.get(char)!;

        if (current.isEndOfWord && current.data) {
          matches.push(current.data);
        }
      }
    }

    return matches;
  }

  /**
   * Remove a keyword from the trie
   */
  remove(keyword: string): boolean {
    const lower = keyword.toLowerCase();
    const path: { node: TrieNode; char: string }[] = [];
    let current = this.root;

    for (const char of lower) {
      if (!current.children.has(char)) {
        return false;
      }
      path.push({ node: current, char });
      current = current.children.get(char)!;
    }

    if (!current.isEndOfWord) {
      return false;
    }

    current.isEndOfWord = false;
    current.data = undefined;
    this.size--;

    // Clean up empty nodes from the bottom up
    for (let i = path.length - 1; i >= 0; i--) {
      const { node, char } = path[i];
      const child = node.children.get(char)!;
      if (!child.isEndOfWord && child.children.size === 0) {
        node.children.delete(char);
      } else {
        break;
      }
    }

    return true;
  }

  /**
   * Get the number of keywords in the trie
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Clear all keywords from the trie
   */
  clear(): void {
    this.root = { children: new Map(), isEndOfWord: false };
    this.size = 0;
  }

  /**
   * Build trie from an array of string-keyword pairs
   */
  static fromKeywords(keywords: Array<{ keyword: string; category: string; enabled: boolean; builtin: boolean }>): KeywordTrie {
    const trie = new KeywordTrie();
    for (const kw of keywords) {
      if (kw.keyword && kw.keyword.trim()) {
        trie.insert(kw.keyword.trim(), {
          category: kw.category,
          enabled: kw.enabled,
          builtin: kw.builtin,
        });
      }
    }
    return trie;
  }

  /**
   * Convert trie back to array of keyword entries
   */
  toKeywords(): KeywordData[] {
    const keywords: KeywordData[] = [];
    this.collectKeywords(this.root, '', keywords);
    return keywords;
  }

  private collectKeywords(node: TrieNode, prefix: string, keywords: KeywordData[]): void {
    if (node.isEndOfWord && node.data) {
      keywords.push(node.data);
    }

    for (const [char, child] of node.children) {
      this.collectKeywords(child, prefix + char, keywords);
    }
  }
}

/**
 * Specialized Set-based matcher for channel IDs and video IDs.
 * O(1) lookups for exact matches.
 */
export class IdSet {
  private set: Set<string>;
  private map: Map<string, { id: string; name: string; category: string; enabled: boolean; builtin: boolean }>;

  constructor() {
    this.set = new Set();
    this.map = new Map();
  }

  add(id: string, data: { name: string; category: string; enabled: boolean; builtin: boolean }): void {
    this.set.add(id);
    this.map.set(id, { id, ...data });
  }

  has(id: string): boolean {
    return this.set.has(id);
  }

  get(id: string): { id: string; name: string; category: string; enabled: boolean; builtin: boolean } | undefined {
    return this.map.get(id);
  }

  delete(id: string): boolean {
    this.map.delete(id);
    return this.set.delete(id);
  }

  clear(): void {
    this.set.clear();
    this.map.clear();
  }

  getSize(): number {
    return this.set.size;
  }

  values(): Array<{ id: string; name: string; category: string; enabled: boolean; builtin: boolean }> {
    return Array.from(this.map.values());
  }
}
