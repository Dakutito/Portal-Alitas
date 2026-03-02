import { create } from 'zustand'

export const useStore = create((set) => ({
  // Auth
  user: null,
  profile: null,
  authReady: false,            // true cuando ya verificamos la sesión
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthReady: (v) => set({ authReady: v }),
  logout: () => set({ user: null, profile: null }),

  // Toast
  toast: null,
  showToast: (type, icon, title, sub) => {
    set({ toast: { type, icon, title, sub, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 4000)
  },

  // Order state
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
