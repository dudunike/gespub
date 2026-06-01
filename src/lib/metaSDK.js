// Facebook JavaScript SDK — wrapper para OAuth com Meta
// O App ID deve estar configurado em VITE_META_APP_ID no .env

const META_API_VERSION = 'v21.0'
// ads_management: leitura + edição de campanhas/orçamentos
// pages_read_engagement: leitura de páginas vinculadas
export const META_SCOPE = 'ads_management,pages_read_engagement'

let _sdkPromise = null

export function loadFBSDK() {
  if (_sdkPromise) return _sdkPromise

  _sdkPromise = new Promise((resolve, reject) => {
    const appId = import.meta.env.VITE_META_APP_ID

    if (!appId || appId === 'SEU_APP_ID_AQUI') {
      reject(new Error('Facebook App ID não configurado. Adicione VITE_META_APP_ID no arquivo .env'))
      return
    }

    // SDK já carregado
    if (window.FB && window._fbSDKReady) {
      resolve(window.FB)
      return
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: META_API_VERSION,
      })
      window._fbSDKReady = true
      resolve(window.FB)
    }

    if (document.getElementById('facebook-jssdk')) return

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    script.onerror = () => {
      _sdkPromise = null
      reject(new Error('Falha ao carregar o Facebook SDK. Verifique sua conexão.'))
    }
    document.head.appendChild(script)
  })

  return _sdkPromise
}

export async function fbLogin() {
  const FB = await loadFBSDK()
  return new Promise((resolve, reject) => {
    FB.login(
      (response) => {
        if (response.authResponse) {
          resolve(response.authResponse)
        } else {
          reject(new Error('Login cancelado ou não autorizado pelo usuário'))
        }
      },
      { scope: META_SCOPE }
    )
  })
}

export async function fbGetLoginStatus() {
  const FB = await loadFBSDK()
  return new Promise((resolve) => {
    FB.getLoginStatus((response) => resolve(response))
  })
}

export async function fbLogout() {
  try {
    const FB = await loadFBSDK()
    return new Promise((resolve) => FB.logout(resolve))
  } catch {
    // SDK pode não estar disponível, ok
  }
}
