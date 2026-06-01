// Facebook JavaScript SDK — wrapper para OAuth com Meta

const META_API_VERSION = 'v21.0'
const META_APP_ID = import.meta.env.VITE_META_APP_ID || '2456845514766257'

export const META_SCOPE = 'ads_management,pages_read_engagement'

let _sdkPromise = null

// Sempre chama FB.init() antes de resolver — evita "FB.login() called before FB.init()"
function _initFB() {
  window.FB.init({
    appId:   META_APP_ID,
    cookie:  true,
    xfbml:   false,
    version: META_API_VERSION,
  })
}

export function loadFBSDK() {
  if (_sdkPromise) return _sdkPromise

  _sdkPromise = new Promise((resolve, reject) => {
    // SDK já carregado → reinicializa (seguro chamar FB.init múltiplas vezes)
    if (window.FB) {
      _initFB()
      resolve(window.FB)
      return
    }

    let timeoutId

    const onReady = () => {
      clearTimeout(timeoutId)
      _initFB()
      resolve(window.FB)
    }

    // Timeout de 15s caso o script não carregue
    timeoutId = setTimeout(() => {
      _sdkPromise = null
      reject(new Error(
        'O Facebook SDK demorou demais para carregar. ' +
        'Desative extensões de bloqueio de anúncios (uBlock, AdBlock) e recarregue a página.'
      ))
    }, 15000)

    window.fbAsyncInit = onReady

    // Só adiciona o script se ainda não estiver no DOM
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      script.onerror = () => {
        clearTimeout(timeoutId)
        _sdkPromise = null
        reject(new Error(
          'Não foi possível carregar o Facebook SDK. ' +
          'Verifique sua conexão ou desative extensões de bloqueio de anúncios.'
        ))
      }
      document.head.appendChild(script)
    }
    // Se o script já está no DOM mas fbAsyncInit ainda não foi chamado,
    // ficamos aguardando — o SDK chamará window.fbAsyncInit quando pronto.
  })

  return _sdkPromise
}

export async function fbLogin() {
  const FB = await loadFBSDK()

  return new Promise((resolve, reject) => {
    // Timeout de 2 minutos — tempo para o usuário interagir com o popup
    const timeoutId = setTimeout(() => {
      reject(new Error(
        'O popup do Facebook não abriu ou não respondeu. ' +
        'Permita popups para gespub.online no ícone ao lado da barra de endereço e tente novamente.'
      ))
    }, 120_000)

    try {
      FB.login(
        (response) => {
          clearTimeout(timeoutId)
          if (response.authResponse) {
            resolve(response.authResponse)
          } else {
            reject(new Error(
              'Login cancelado ou permissões não concedidas. ' +
              'Clique em "Continuar" e autorize as permissões solicitadas.'
            ))
          }
        },
        { scope: META_SCOPE, return_scopes: true }
      )
    } catch {
      clearTimeout(timeoutId)
      // FB.login lança se o popup for bloqueado imediatamente
      reject(new Error(
        'Popup bloqueado pelo navegador. ' +
        'Clique no ícone de popup na barra de endereço para permitir e tente novamente.'
      ))
    }
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
    // SDK pode não estar disponível, tudo bem
  }
}
