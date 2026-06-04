// Facebook JavaScript SDK — wrapper para OAuth com Meta

const META_API_VERSION = 'v21.0'
export const META_APP_ID = import.meta.env.VITE_META_APP_ID || '2456845514766257'

export const META_SCOPE = 'ads_management,pages_show_list,pages_read_engagement'

let _sdkPromise = null

// Chama FB.init() e resolve a promise — só chamado após o script ter executado
function _initAndResolve(resolve, reject) {
  try {
    window.FB.init({
      appId:   META_APP_ID,
      cookie:  true,
      xfbml:   false,
      version: META_API_VERSION,
    })
    resolve(window.FB)
  } catch (err) {
    _sdkPromise = null
    reject(new Error('Erro ao inicializar Facebook SDK: ' + err.message))
  }
}

export function loadFBSDK() {
  if (_sdkPromise) return _sdkPromise

  _sdkPromise = new Promise((resolve, reject) => {

    // SDK já foi carregado e executado nesta sessão
    if (window.FB) {
      _initAndResolve(resolve, reject)
      return
    }

    // Script já está no DOM mas ainda carregando — ouve o evento de load
    const existing = document.getElementById('facebook-jssdk')
    if (existing) {
      existing.addEventListener('load', () => _initAndResolve(resolve, reject), { once: true })
      existing.addEventListener('error', () => {
        _sdkPromise = null
        reject(new Error('Falha ao carregar o Facebook SDK.'))
      }, { once: true })
      return
    }

    // Carrega o script pela primeira vez
    const timeoutId = setTimeout(() => {
      _sdkPromise = null
      reject(new Error(
        'O Facebook SDK demorou demais para carregar. ' +
        'Desative extensões de bloqueio de anúncios (uBlock, AdBlock) e tente novamente.'
      ))
    }, 15_000)

    const script = document.createElement('script')
    script.id    = 'facebook-jssdk'
    script.src   = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true

    script.addEventListener('load', () => {
      clearTimeout(timeoutId)
      _initAndResolve(resolve, reject)
    }, { once: true })

    script.addEventListener('error', () => {
      clearTimeout(timeoutId)
      _sdkPromise = null
      reject(new Error(
        'Não foi possível carregar o Facebook SDK. ' +
        'Verifique sua conexão ou desative extensões de bloqueio de anúncios.'
      ))
    }, { once: true })

    document.head.appendChild(script)
  })

  return _sdkPromise
}

export async function fbLogin() {
  const FB = await loadFBSDK()

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(
        'O popup do Facebook não respondeu. ' +
        'Permita popups para gespub.online na barra de endereço e tente novamente.'
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
              'Login cancelado. Autorize as permissões solicitadas para continuar.'
            ))
          }
        },
        { scope: META_SCOPE, return_scopes: true }
      )
    } catch {
      clearTimeout(timeoutId)
      reject(new Error(
        'Popup bloqueado pelo navegador. ' +
        'Permita popups para gespub.online e tente novamente.'
      ))
    }
  })
}

export async function fbLogout() {
  try {
    const FB = await loadFBSDK()
    return new Promise((resolve) => FB.logout(resolve))
  } catch {
    // ok se SDK não estiver disponível
  }
}
