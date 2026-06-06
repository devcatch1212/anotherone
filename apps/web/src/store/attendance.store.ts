import { create } from 'zustand';
import { AttendanceState, AttendanceRecord } from '@/types';

interface AttendanceStoreState {
  state: AttendanceState;
  todayRecord: AttendanceRecord | null;
  records: AttendanceRecord[];
  setState: (s: AttendanceState) => void;
  setTodayRecord: (r: AttendanceRecord) => void;
  setRecords: (r: AttendanceRecord[]) => void;
}

export const useAttendanceStore = create<AttendanceStoreState>((set) => ({
  state: 'before',
  todayRecord: null,
  records: [],
  setState: (state) => set({ state }),
  setTodayRecord: (todayRecord) => set({ todayRecord }),
  setRecords: (records) => set({ records }),
}));
