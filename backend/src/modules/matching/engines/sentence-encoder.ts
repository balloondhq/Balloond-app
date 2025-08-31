// Sentence Encoder for NLP-based prompt matching
import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export class SentenceEncoder {
  private model: any;
  private initialized: boolean = false;

  async initialize() {
    if (!this.initialized) {
      try {
        this.model = await use.load();
        this.initialized = true;
        console.log('Sentence encoder initialized successfully');
      } catch (error) {
        console.error('Error loading sentence encoder:', error);
        // Fallback to basic text processing
        this.initialized = false;
      }
    }
  }

  async encodeText(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.model) {
      const embeddings = await this.model.embed([text]);
      const embeddingArray = await embeddings.array();
      embeddings.dispose();
      return embeddingArray[0];
    } else {
      // Fallback: Create basic feature vector from text
      return this.createBasicEmbedding(text);
    }
  }

  async encodeBatch(texts: string[]): Promise<number[][]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.model) {
      const embeddings = await this.model.embed(texts);
      const embeddingsArray = await embeddings.array();
      embeddings.dispose();
      return embeddingsArray;
    } else {
      return texts.map(text => this.createBasicEmbedding(text));
    }
  }

  private createBasicEmbedding(text: string): number[] {
    // Create a simple 512-dimensional embedding based on text features
    const embedding = new Array(512).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    // Basic features
    embedding[0] = text.length / 1000; // Normalized length
    embedding[1] = words.length / 100; // Word count
    embedding[2] = (text.match(/[.!?]/g) || []).length / 10; // Sentence count
    
    // Character distribution
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = 3 + (charCode % 100);
      embedding[index] = (embedding[index] || 0) + 1/text.length;
    }
    
    // Word hashing
    words.forEach((word, idx) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      const index = 103 + Math.abs(hash % 400);
      embedding[index] = (embedding[index] || 0) + 1/words.length;
    });
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (norm || 1));
  }

  async compareTexts(text1: string, text2: string): Promise<number> {
    const [emb1, emb2] = await this.encodeBatch([text1, text2]);
    return this.cosineSimilarity(emb1, emb2);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  async findSimilarPrompts(targetPrompt: string, prompts: string[], topK: number = 5): Promise<{prompt: string, similarity: number}[]> {
    const targetEmbedding = await this.encodeText(targetPrompt);
    const promptEmbeddings = await this.encodeBatch(prompts);
    
    const similarities = promptEmbeddings.map((embedding, idx) => ({
      prompt: prompts[idx],
      similarity: this.cosineSimilarity(targetEmbedding, embedding)
    }));
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async extractKeywords(text: string): Promise<string[]> {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'will', 'your', 'what', 'when', 'where', 'which', 'their', 'would', 'there', 'could', 'should', 'about', 'after', 'before', 'during']);
    
    return Array.from(wordFreq.entries())
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  async categorizeText(text: string): Promise<string[]> {
    const keywords = await this.extractKeywords(text);
    const categories = [];
    
    // Simple category detection based on keywords
    const categoryKeywords = {
      'travel': ['travel', 'trip', 'adventure', 'explore', 'journey', 'vacation', 'abroad'],
      'fitness': ['gym', 'workout', 'fitness', 'exercise', 'health', 'running', 'yoga'],
      'food': ['food', 'cooking', 'restaurant', 'chef', 'cuisine', 'meal', 'recipe'],
      'music': ['music', 'concert', 'song', 'band', 'album', 'spotify', 'playlist'],
      'movies': ['movie', 'film', 'cinema', 'netflix', 'watch', 'series', 'show'],
      'books': ['book', 'reading', 'novel', 'author', 'literature', 'story', 'write'],
      'nature': ['nature', 'outdoor', 'hiking', 'camping', 'mountain', 'beach', 'forest'],
      'art': ['art', 'painting', 'drawing', 'museum', 'gallery', 'creative', 'design'],
      'tech': ['tech', 'technology', 'coding', 'software', 'startup', 'developer', 'computer'],
      'sports': ['sports', 'game', 'team', 'football', 'basketball', 'soccer', 'tennis']
    };
    
    for (const [category, catKeywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => catKeywords.includes(keyword))) {
        categories.push(category);
      }
    }
    
    return categories;
  }
}