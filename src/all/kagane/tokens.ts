// Port of src/all/kagane/.../Kagane.kt @ d9420cd1: the per-book page tokens (pageTokens and refreshToken).
// Tokens are valid for one book only; the newest one known for a book replaces the one in a page URL.

const TOKEN_REFRESH_INTERVAL_MS = 60_000;

export interface PageToken {
  value: string;
  issuedAt: number;
}

/** `LruCache<String, PageToken>(16)`, keyed by the book (chapter) ID. */
export class PageTokens {
  private readonly tokens = new Map<string, PageToken>();

  get(chapterId: string): PageToken | undefined {
    return this.tokens.get(chapterId);
  }

  put(chapterId: string, token: PageToken): void {
    this.tokens.delete(chapterId);
    this.tokens.set(chapterId, token);
    while (this.tokens.size > 16) {
      this.tokens.delete(this.tokens.keys().next().value as string);
    }
  }

  /**
   * Upstream's `refreshToken`, called by the interceptor after the image host rejects a token;
   * `fetchToken` answers the book's read challenge. Kept for when the SDK can retry image
   * requests; nothing calls it yet.
   */
  async refreshToken(chapterId: string, rejected: string, fetchToken: () => Promise<string>): Promise<string> {
    const known = this.get(chapterId);
    if (known !== undefined && known.value !== rejected) return known.value;

    const now = Date.now();
    if (known !== undefined && now - known.issuedAt < TOKEN_REFRESH_INTERVAL_MS) {
      throw new Error("Failed to retrieve token");
    }

    this.put(chapterId, { value: rejected, issuedAt: now });
    let token: string;
    try {
      token = await fetchToken();
    } catch {
      throw new Error("Failed to retrieve token");
    }

    this.put(chapterId, { value: token, issuedAt: now });
    return token;
  }
}
