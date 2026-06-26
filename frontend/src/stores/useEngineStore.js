import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useEngineStore = create(
  persist(
    (set) => ({
      currentSimulationState: null,
      baselineState: null,

      // Actions
      setCurrentSimulationState: (state) => set({ currentSimulationState: state }),
      setBaselineState: (state) => set({ baselineState: state }),
      
      updateSimulationState: (updates) => set((state) => ({
        currentSimulationState: typeof updates === 'function' 
          ? updates(state.currentSimulationState) 
          : { ...state.currentSimulationState, ...updates }
      })),

      updateBaselineState: (updates) => set((state) => ({
        baselineState: typeof updates === 'function' 
          ? updates(state.baselineState) 
          : { ...state.baselineState, ...updates }
      })),

      resetStore: () => set({ currentSimulationState: null, baselineState: null })
    }),
    {
      name: 'opto-profit-engine-store',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);

export default useEngineStore;
