// Constantes globais do sistema GESPUB.AI

// Itens de navegação da plataforma
export const PLATFORM_NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'IconLayoutDashboard' },
  { label: 'Campanhas', path: '/campanhas', icon: 'IconSpeakerphone' },
  { label: 'Conjuntos', path: '/conjuntos', icon: 'IconStack2' },
  { label: 'Anúncios', path: '/anuncios', icon: 'IconPhoto' },
  { label: 'Agentes IA', path: '/agentes', icon: 'IconRobot', showBadge: true },
  { label: 'Regras', path: '/regras', icon: 'IconAdjustments' },
  { label: 'Insights', path: '/insights', icon: 'IconSparkles' },
  { label: 'Conexões', path: '/conexoes', icon: 'IconPlugConnected' },
]

// Itens de navegação do ADIM
export const ADMIN_NAV_ITEMS = [
  { label: 'Visão Geral', path: '/admin', icon: 'IconLayoutDashboard' },
  { label: 'Usuários', path: '/admin/usuarios', icon: 'IconUsers' },
  { label: 'Agentes & Regras', path: '/admin/agentes-regras', icon: 'IconRobot' },
  { label: 'Logs', path: '/admin/logs', icon: 'IconFileText' },
  { label: 'Configurações', path: '/admin/configuracoes', icon: 'IconSettings' },
]

// Títulos das páginas
export const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/campanhas': 'Campanhas',
  '/conjuntos': 'Conjuntos de Anúncios',
  '/anuncios': 'Anúncios',
  '/agentes': 'Agentes IA',
  '/regras': 'Regras',
  '/insights': 'Insights IA',
  '/conexoes': 'Conexões',
  '/admin': 'Visão Geral',
  '/admin/usuarios': 'Usuários',
  '/admin/agentes-regras': 'Agentes & Regras',
  '/admin/logs': 'Logs & Atividade',
  '/admin/configuracoes': 'Configurações',
}

// Botões contextuais por página
export const PAGE_ACTIONS = {
  '/campanhas': 'Nova campanha',
  '/conjuntos': 'Novo conjunto',
  '/anuncios': 'Novo anúncio',
  '/agentes': 'Criar agente',
  '/regras': 'Nova regra',
  '/admin/usuarios': 'Criar usuário',
}

// Planos disponíveis
export const PLANS = [
  { id: 'starter', label: 'Starter', maxAgents: 2, maxRules: 5, maxCampaigns: 10 },
  { id: 'pro', label: 'Pro', maxAgents: 10, maxRules: 25, maxCampaigns: 50 },
  { id: 'enterprise', label: 'Enterprise', maxAgents: 999, maxRules: 999, maxCampaigns: 999 },
]

// Funções dos agentes IA
export const AGENT_FUNCTIONS = [
  { id: 'optimize_roas', label: 'Otimizar ROAS' },
  { id: 'control_cpa', label: 'Controlar CPA' },
  { id: 'detect_fatigue', label: 'Detectar fadiga de criativo' },
  { id: 'scale_budget', label: 'Escalar orçamento' },
  { id: 'monitor_ctr', label: 'Monitorar CTR' },
  { id: 'custom', label: 'Personalizado' },
]

// Métricas disponíveis
export const METRICS = [
  { id: 'roas', label: 'ROAS' },
  { id: 'cpa', label: 'CPA' },
  { id: 'ctr', label: 'CTR' },
  { id: 'cpc', label: 'CPC' },
  { id: 'cpm', label: 'CPM' },
  { id: 'frequency', label: 'Frequência' },
  { id: 'budget_remaining', label: 'Orçamento restante' },
  { id: 'impressions', label: 'Impressões' },
  { id: 'conversions', label: 'Conversões' },
]

// Operadores para regras
export const OPERATORS = [
  { id: 'gte', label: '≥', description: 'maior ou igual a' },
  { id: 'lte', label: '≤', description: 'menor ou igual a' },
  { id: 'gt', label: '>', description: 'maior que' },
  { id: 'lt', label: '<', description: 'menor que' },
  { id: 'eq', label: '=', description: 'igual a' },
]

// Ações automáticas das regras
export const RULE_ACTIONS = [
  { id: 'increase_budget', label: 'Aumentar orçamento' },
  { id: 'decrease_budget', label: 'Reduzir orçamento' },
  { id: 'pause_campaign', label: 'Pausar campanha' },
  { id: 'pause_ad', label: 'Pausar anúncio' },
  { id: 'send_notification', label: 'Enviar notificação' },
  { id: 'send_email', label: 'Enviar e-mail' },
]

// Frequências de análise dos agentes
export const ANALYSIS_FREQUENCIES = [
  { id: 'realtime', label: 'Tempo real' },
  { id: '6h', label: 'A cada 6h' },
  { id: '12h', label: 'A cada 12h' },
  { id: 'daily', label: 'Diário' },
]

// Objetivos de campanha
export const CAMPAIGN_OBJECTIVES = [
  { id: 'conversions', label: 'Conversões' },
  { id: 'traffic', label: 'Tráfego' },
  { id: 'awareness', label: 'Reconhecimento' },
  { id: 'engagement', label: 'Engajamento' },
  { id: 'leads', label: 'Geração de leads' },
  { id: 'sales', label: 'Vendas' },
]
