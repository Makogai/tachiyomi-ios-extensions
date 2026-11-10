import { applyFilterStates, type FilterJSON } from "./filters.js";
import { Page, SChapter, SManga } from "./models.js";
import { PreferenceScreen } from "./preferences.js";
import type { KeiSource } from "./source.js";

/** Host API level this SDK targets. Must match `extensionHostAPILevel` in the app. */
export const API_LEVEL = 1;

type Callback = (error: string | null, resultJSON: string | null) => void;

/**
 * What the app calls. An extension's entry file must `export default defineExtension([...])`;
 * the build wraps it as `__extension.default`.
 */
export interface ExtensionExports {
  api: number;
  sources: KeiSource[];
  describe(index: number): string;
  invoke(index: number, method: string, argumentsJSON: string, callback: Callback): void;
  rateLimitFor(index: number, url: string): number | null;
  cookiesFor(index: number, url: string): string;
}

const methods: Record<string, (source: KeiSource, args: unknown[]) => unknown> = {
  getPopularManga: (source, [page]) => source.getPopularManga(page as number),
  getLatestUpdates: (source, [page]) => source.getLatestUpdates(page as number),
  getSearchManga: (source, [page, query, filters]) =>
    source.getSearchManga(
      page as number,
      query as string,
      applyFilterStates(source.getFilterList(), (filters as FilterJSON[]) ?? []),
    ),
  getFilterList: (source) => source.getFilterList(),
  getMangaUpdate: (source, [manga, chapters, fetchDetails, fetchChapters]) =>
    source.fetchMangaUpdate(
      SManga.from(manga as Partial<SManga>),
      (chapters as Partial<SChapter>[]).map((chapter) => SChapter.from(chapter)),
      fetchDetails as boolean,
      fetchChapters as boolean,
    ),
  getPageList: (source, [chapter]) => source.getPageList(SChapter.from(chapter as Partial<SChapter>)),
  getImageUrl: (source, [page]) => source.getImageUrl(Page.from(page as { index: number })),
  getImageRequest: (source, [page]) => source.getImageRequest(Page.from(page as { index: number })),
};

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ? `${error.name}: ${error.message}\n${error.stack}` : `${error.name}: ${error.message}`;
  }
  return String(error);
}

export function defineExtension(sources: KeiSource[]): ExtensionExports {
  sources.forEach((source, index) => {
    source.index = index;
  });
  return {
    api: API_LEVEL,
    sources,
    describe(index) {
      const source = sources[index];
      const screen = new PreferenceScreen();
      source.setupPreferenceScreen(screen);
      const builder = source.clientBuilder;
      return JSON.stringify({
        name: source.name,
        lang: source.lang,
        baseUrl: source.baseUrl,
        supportsLatest: source.supportsLatest,
        versionId: source.versionId,
        id: source.id,
        client: {
          userAgent: null,
          headers: {},
          rateLimits: builder.rateLimits.map(({ permits, periodMs, intervalMs }) => ({ permits, periodMs, intervalMs })),
        },
        preferences: screen.preferences.map((preference) => preference.toJSON()),
      });
    },
    invoke(index, method, argumentsJSON, callback) {
      const source = sources[index];
      const call = methods[method];
      if (!source || !call) {
        callback(`Unknown call ${method} on source ${index}`, null);
        return;
      }
      Promise.resolve()
        .then(() => call(source, JSON.parse(argumentsJSON) as unknown[]))
        .then(
          (result) => callback(null, JSON.stringify(result ?? null)),
          (error: unknown) => callback(describeError(error), null),
        );
    },
    rateLimitFor(index, url) {
      return sources[index].clientBuilder.rateLimitFor(url);
    },
    cookiesFor(index, url) {
      return JSON.stringify(sources[index].clientBuilder.cookiesFor(url));
    },
  };
}
