import { create } from 'zustand'

export const useStore = create((set) => ({
  user: null,
  profile: null,
  ready: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setReady: (v) => set({ ready: v }),
  logout: () => set({ user: null, profile: null }),

  toast: null,
  showToast: (type, icon, title, sub) => {
    set({ toast: { type, icon, title, sub, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 4000)
  },

  selCombo: null,
  salsas: {},
  arrozQty: {},
  bebCounts: {},
  tipoServicio: 'servir',
  setSelCombo: (c) => set({ selCombo: c }),
  setSalsas: (s) => set({ salsas: s }),
  setArrozQty: (a) => set({ arrozQty: a }),
  setBebCounts: (b) => set({ bebCounts: b }),
  setTipoServicio: (t) => set({ tipoServicio: t }),
  resetOrder: () => set({ selCombo: null, salsas: {}, arrozQty: {}, bebCounts: {}, tipoServicio: 'servir' }),
}))