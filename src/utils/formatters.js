// Funções de formatação para o padrão brasileiro

// Formatar valor monetário em BRL (R$)
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formatar percentual com 1 casa decimal
export const formatPercent = (value) => {
  return `${value.toFixed(1)}%`
}

// Formatar número com separadores de milhar BR
export const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

// Formatar ROAS com 1 casa decimal e sufixo ×
export const formatRoas = (value) => {
  return `${value.toFixed(1)}×`
}

// Formatar data no padrão brasileiro
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

// Formatar data e hora no padrão brasileiro
export const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Formatar tempo relativo (ex: "há 2 horas")
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'agora mesmo'
  if (diffMinutes < 60) return `há ${diffMinutes} min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays < 30) return `há ${diffDays}d`
  return formatDate(dateString)
}

// Gerar iniciais a partir do nome completo
export const getInitials = (name) => {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Formatar número compacto (1.2k, 3.5M)
export const formatCompact = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toString()
}
