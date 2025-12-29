
export enum ItemStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface BatchItem {
  id: string;
  file: File;
  original: string;
  edited: string | null;
  status: ItemStatus;
  error?: string;
  width: number;
  height: number;
}

export interface AppState {
  items: BatchItem[];
  isProcessing: boolean;
}
