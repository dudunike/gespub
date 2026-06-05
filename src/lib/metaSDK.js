// Meta App Constants — Usado apenas para o fluxo OAuth Authorization Code (Server-side)

export const META_API_VERSION = 'v21.0'
export const META_APP_ID = import.meta.env.VITE_META_APP_ID

if (!META_APP_ID) {
  console.error('VITE_META_APP_ID não configurado no .env')
}

export const META_SCOPE = 'ads_management,pages_show_list,pages_read_engagement'
