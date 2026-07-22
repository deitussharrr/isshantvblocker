/**
 * Trie data structure for efficient keyword matching.
 * Supports fast lookups with O(k) complexity where k is keyword length.
 * Ideal for 100,000+ keyword matching without linear scans.
 */
export interface KeywordData {
    keyword: string;
    category: string;
    enabled: boolean;
    builtin: boolean;
}
export declare class KeywordTrie {
    private root;
    private size;
    constructor();
    /**
     * Insert a keyword into the trie
     */
    insert(keyword: string, data: Omit<KeywordData, 'keyword'>): void;
    /**
     * Search for a keyword exactly
     */
    search(keyword: string): KeywordData | null;
    /**
     * Check if any keyword in the trie matches within the given text
     * Returns the first matching keyword data, or null if no match
     */
    findMatch(text: string): KeywordData | null;
    /**
     * Check if any keyword in the trie matches within the given text
     * Returns all matching keyword data
     */
    findAllMatches(text: string): KeywordData[];
    /**
     * Remove a keyword from the trie
     */
    remove(keyword: string): boolean;
    /**
     * Get the number of keywords in the trie
     */
    getSize(): number;
    /**
     * Clear all keywords from the trie
     */
    clear(): void;
    /**
     * Build trie from an array of string-keyword pairs
     */
    static fromKeywords(keywords: Array<{
        keyword: string;
        category: string;
        enabled: boolean;
        builtin: boolean;
    }>): KeywordTrie;
    /**
     * Convert trie back to array of keyword entries
     */
    toKeywords(): KeywordData[];
    private collectKeywords;
}
/**
 * Specialized Set-based matcher for channel IDs and video IDs.
 * O(1) lookups for exact matches.
 */
export declare class IdSet {
    private set;
    private map;
    constructor();
    add(id: string, data: {
        name: string;
        category: string;
        enabled: boolean;
        builtin: boolean;
    }): void;
    has(id: string): boolean;
    get(id: string): {
        id: string;
        name: string;
        category: string;
        enabled: boolean;
        builtin: boolean;
    } | undefined;
    delete(id: string): boolean;
    clear(): void;
    getSize(): number;
    values(): Array<{
        id: string;
        name: string;
        category: string;
        enabled: boolean;
        builtin: boolean;
    }>;
}
//# sourceMappingURL=trie.d.ts.map