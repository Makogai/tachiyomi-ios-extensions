// keiyoushi's `KeiSource` filter fetching (`supportsFilterFetching`, `fetchFilterData`,
// `getFilterList(data)`), which the SDK does not have: `getFilterList()` builds the filters from
// the stored data and, when there is none or it is older than three days, fetches it in the
// background for the next call. The data is kept in the source's settings.
import { type KeiSource, log } from "@sdk";

const FILTER_DATA = "filter_data";
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/** Shown while filters are unavailable, as upstream's `filterFetchHint`. */
export const FILTER_FETCH_HINT = "Tap 'Reset' to load filters";

export class FilterDataCache<T> {
  private inFlight = false;

  constructor(
    private readonly source: KeiSource,
    private readonly fetchFilterData: () => Promise<T>,
  ) {}

  /** The stored data, or null. Starts a background fetch when it is missing or stale. */
  read(): T | null {
    let stored: { fetchedAt: number; data: T } | null = null;
    try {
      const json = this.source.preferences.getString(FILTER_DATA, "");
      if (json !== "") stored = JSON.parse(json) as { fetchedAt: number; data: T };
    } catch {
      stored = null;
    }
    if (stored === null || Date.now() - stored.fetchedAt > MAX_AGE_MS) this.triggerBackgroundFetch();
    return stored?.data ?? null;
  }

  private triggerBackgroundFetch(): void {
    if (this.inFlight) return;
    this.inFlight = true;
    Promise.resolve()
      .then(() => this.fetchFilterData())
      .then((data) => {
        this.source.preferences
          .edit()
          .putString(FILTER_DATA, JSON.stringify({ fetchedAt: Date.now(), data }))
          .apply();
      })
      .catch((error: unknown) => {
        try {
          log.warn(`${this.source.name}: failed to fetch filter data: ${String(error)}`);
        } catch {
          // No host (build-time describe).
        }
      })
      .finally(() => {
        this.inFlight = false;
      });
  }
}
