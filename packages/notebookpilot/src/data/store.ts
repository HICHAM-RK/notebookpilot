import { DataError, parseCsv } from "./import";
import { profileCsv, type DatasetProfile } from "./profile";

export interface DatasetStorage {
  save(fileName: string, bytes: Uint8Array): Promise<void>;
  remove(fileName: string): Promise<void>;
}

export interface DatasetSummary extends DatasetProfile {
  datasetId: string;
  displayName: string;
  fileName: string;
  shareSamples: boolean;
}

export interface DatasetToolProfile extends DatasetProfile {
  datasetId: string;
  fileName: string;
  sampleRows?: { headers: string[]; rows: string[][] };
}

export class DatasetError extends Error {
  constructor(
    public readonly code:
      | "INVALID_ARGUMENT"
      | "LIMIT_EXCEEDED"
      | "NOT_FOUND"
      | "CANCELLED"
      | "INTERNAL_ERROR",
  ) {
    super(code);
  }
}

interface DatasetRecord {
  notebookId: string;
  summary: DatasetSummary;
  bytes: Uint8Array;
}

interface DatasetLimits {
  maxDatasets: number;
  maxTotalBytes: number;
}

const defaultLimits: DatasetLimits = {
  maxDatasets: 20,
  maxTotalBytes: 50 * 1024 * 1024,
};

function copySummary(summary: DatasetSummary): DatasetSummary {
  return {
    ...summary,
    columns: summary.columns.map((column) => ({ ...column })),
    warnings: [...summary.warnings],
  };
}

/** Session-owned registry. Dataset IDs never become caller-controlled paths. */
export class DatasetStore {
  private readonly records = new Map<string, DatasetRecord>();
  private readonly listeners = new Set<() => void>();
  private readonly limits: DatasetLimits;
  private pendingUploads = 0;
  private reservedBytes = 0;
  private storedBytes = 0;

  constructor(
    private readonly storage: DatasetStorage,
    private readonly createId: () => string = () => crypto.randomUUID(),
    limits: Partial<DatasetLimits> = {},
  ) {
    this.limits = { ...defaultLimits, ...limits };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  list(notebookId: string): DatasetSummary[] {
    return [...this.records.values()]
      .filter((record) => record.notebookId === notebookId)
      .map((record) => copySummary(record.summary));
  }

  async upload(
    notebookId: string,
    suppliedName: string,
    bytes: Uint8Array,
    signal: AbortSignal = new AbortController().signal,
  ): Promise<DatasetSummary> {
    const displayName = suppliedName.split(/[\\/]/).at(-1) ?? "";
    if (
      !notebookId ||
      notebookId.length > 128 ||
      !displayName ||
      displayName.length > 255 ||
      !displayName.toLowerCase().endsWith(".csv")
    ) {
      throw new DatasetError("INVALID_ARGUMENT");
    }
    if (signal.aborted) throw new DatasetError("CANCELLED");
    if (
      this.records.size + this.pendingUploads >= this.limits.maxDatasets ||
      this.storedBytes + this.reservedBytes + bytes.byteLength >
        this.limits.maxTotalBytes
    ) {
      throw new DatasetError("LIMIT_EXCEEDED");
    }
    this.pendingUploads++;
    this.reservedBytes += bytes.byteLength;
    let fileName: string | null = null;
    let saved = false;
    try {
      const profile = await profileCsv(bytes);
      if (signal.aborted) throw new DatasetError("CANCELLED");
      const id = this.createId();
      if (!/^[A-Za-z0-9_-]{1,96}$/.test(id)) {
        throw new DatasetError("INTERNAL_ERROR");
      }
      const datasetId = `dataset_${id}`;
      if (this.records.has(datasetId)) throw new DatasetError("INTERNAL_ERROR");
      fileName = `notebookpilot-${id}.csv`;
      const ownedBytes = Uint8Array.from(bytes);
      await this.storage.save(fileName, ownedBytes);
      saved = true;
      if (signal.aborted) throw new DatasetError("CANCELLED");
      const summary: DatasetSummary = {
        datasetId,
        displayName,
        fileName,
        ...profile,
        shareSamples: false,
      };
      this.records.set(datasetId, { notebookId, summary, bytes: ownedBytes });
      this.storedBytes += ownedBytes.byteLength;
      this.notify();
      return copySummary(summary);
    } catch (error) {
      if (saved && fileName) {
        try {
          await this.storage.remove(fileName);
        } catch {
          // The record is still withheld; storage cleanup can be retried by the host.
        }
      }
      if (error instanceof DatasetError || error instanceof DataError)
        throw error;
      throw new DatasetError("INTERNAL_ERROR");
    } finally {
      this.pendingUploads--;
      this.reservedBytes -= bytes.byteLength;
    }
  }

  setSampleSharing(
    notebookId: string,
    datasetId: string,
    enabled: boolean,
  ): void {
    const record = this.lookup(notebookId, datasetId);
    record.summary.shareSamples = enabled;
    this.notify();
  }

  toolProfile(notebookId: string, datasetId: string): DatasetToolProfile {
    const record = this.lookup(notebookId, datasetId);
    const {
      displayName: _displayName,
      shareSamples,
      ...profile
    } = copySummary(record.summary);
    if (!shareSamples) return profile;
    const parsed = parseCsv(record.bytes);
    return {
      ...profile,
      sampleRows: {
        headers: [...parsed.headers],
        rows: parsed.rows.slice(0, 5).map((row) => [...row]),
      },
    };
  }

  async remove(notebookId: string, datasetId: string): Promise<void> {
    const record = this.lookup(notebookId, datasetId);
    await this.storage.remove(record.summary.fileName);
    this.records.delete(datasetId);
    this.storedBytes -= record.bytes.byteLength;
    this.notify();
  }

  private lookup(notebookId: string, datasetId: string): DatasetRecord {
    const record = this.records.get(datasetId);
    if (!record || record.notebookId !== notebookId) {
      throw new DatasetError("NOT_FOUND");
    }
    return record;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
