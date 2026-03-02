import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      profile: null,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
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
      resetOrder: () => set({
        selCombo: null,
        salsas: {},
        arrozQty: {},
        bebCounts: {},
        tipoServicio: 'servir',
      }),
    }),
    {
      name: 'portal-alitas-storage',
    }
  )
)
