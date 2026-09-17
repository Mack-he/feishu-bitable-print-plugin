import { create } from 'zustand';

export interface SelectedRecord {
  id: string;
  [key: string]: any;
}

interface SelectedDataState {
  // 选中数据
  records: SelectedRecord[];
  // 当前选中的记录索引
  currentIndex: number;
  // 是否正在监听
  isListening: boolean;
  // 是否从飞书选中
  isFromFeishu: boolean;

  // Actions
  setRecords: (records: SelectedRecord[]) => void;
  addRecord: (record: SelectedRecord) => void;
  removeRecord: (id: string) => void;
  clearRecords: () => void;
  setCurrentIndex: (index: number) => void;
  nextRecord: () => void;
  prevRecord: () => void;
  setIsListening: (listening: boolean) => void;
  setIsFromFeishu: (fromFeishu: boolean) => void;
  getCurrentRecord: () => SelectedRecord | null;
}

export const useSelectedDataStore = create<SelectedDataState>((set, get) => ({
  records: [],
  currentIndex: 0,
  isListening: false,
  isFromFeishu: false,

  setRecords: (records) => set({
    records,
    currentIndex: 0,
  }),

  addRecord: (record) => set((state) => ({
    records: [...state.records, record],
  })),

  removeRecord: (id) => set((state) => ({
    records: state.records.filter((r) => r.id !== id),
    currentIndex: Math.min(state.currentIndex, state.records.length - 2),
  })),

  clearRecords: () => set({
    records: [],
    currentIndex: 0,
  }),

  setCurrentIndex: (index) => set((state) => ({
    currentIndex: Math.max(0, Math.min(index, state.records.length - 1)),
  })),

  nextRecord: () => set((state) => ({
    currentIndex: Math.min(state.currentIndex + 1, state.records.length - 1),
  })),

  prevRecord: () => set((state) => ({
    currentIndex: Math.max(state.currentIndex - 1, 0),
  })),

  setIsListening: (listening) => set({ isListening: listening }),

  setIsFromFeishu: (fromFeishu) => set({ isFromFeishu: fromFeishu }),

  getCurrentRecord: () => {
    const { records, currentIndex } = get();
    return records[currentIndex] || null;
  },
}));
