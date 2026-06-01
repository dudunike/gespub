// Dados mockados do painel admin (ADIM)

// KPIs globais do admin
export const adminKpis = {
  totalUsers: 5,
  activeUsersToday: 4,
  totalAgentsRunning: 4,
  totalRulesExecuted24h: 23,
  mrr: 4970.00,
}

// Crescimento de usuários por mês
export const adminUserGrowth = [
  { month: 'Jan', users: 1 },
  { month: 'Fev', users: 2 },
  { month: 'Mar', users: 3 },
  { month: 'Abr', users: 4 },
  { month: 'Mai', users: 5 },
  { month: 'Jun', users: 5 },
]

// Feed de atividade recente global
export const adminActivityFeed = [
  {
    id: 'act_001',
    timestamp: '2025-06-10T14:32:00Z',
    userId: 'usr_001',
    userName: 'Eduardo Silva',
    agentName: 'Guardião de ROAS',
    action: 'Executou regra "Escalar ROAS alto"',
    result: 'Orçamento da campanha "Black Friday" aumentado em 20%',
    type: 'rule_execution',
  },
  {
    id: 'act_002',
    timestamp: '2025-06-10T14:00:00Z',
    userId: 'usr_001',
    userName: 'Eduardo Silva',
    agentName: null,
    action: 'Sincronização Meta Ads',
    result: '6 campanhas atualizadas com sucesso',
    type: 'sync',
  },
  {
    id: 'act_003',
    timestamp: '2025-06-10T12:00:00Z',
    userId: 'usr_001',
    userName: 'Eduardo Silva',
    agentName: 'Vigia de CTR',
    action: 'Executou regra "Alerta CTR baixo"',
    result: 'Notificação enviada — CTR 0.9% no anúncio institucional',
    type: 'rule_execution',
  },
  {
    id: 'act_004',
    timestamp: '2025-06-10T09:45:00Z',
    userId: 'usr_003',
    userName: 'Rafael Mendes',
    agentName: null,
    action: 'Login na plataforma',
    result: 'Acesso autorizado',
    type: 'login',
  },
  {
    id: 'act_005',
    timestamp: '2025-06-10T08:15:00Z',
    userId: 'usr_001',
    userName: 'Eduardo Silva',
    agentName: 'Sentinela de CPA',
    action: 'Executou regra "Proteger CPA alto"',
    result: 'Anúncio "Frete grátis" pausado — CPA R$ 14,25',
    type: 'rule_execution',
  },
  {
    id: 'act_006',
    timestamp: '2025-06-09T22:00:00Z',
    userId: 'usr_001',
    userName: 'Eduardo Silva',
    agentName: 'Detector de Fadiga',
    action: 'Executou regra "Detectar criativo saturado"',
    result: 'Fadiga detectada no "Carrossel — Top 5 Produtos"',
    type: 'rule_execution',
  },
  {
    id: 'act_007',
    timestamp: '2025-06-09T18:15:00Z',
    userId: 'usr_002',
    userName: 'Marina Costa',
    agentName: null,
    action: 'Login na plataforma',
    result: 'Acesso autorizado',
    type: 'login',
  },
  {
    id: 'act_008',
    timestamp: '2025-06-09T16:00:00Z',
    userId: 'usr_002',
    userName: 'Marina Costa',
    agentName: null,
    action: 'Criou nova campanha',
    result: 'Campanha "Promoção de Inverno" criada como rascunho',
    type: 'campaign_action',
  },
  {
    id: 'act_009',
    timestamp: '2025-06-08T22:10:00Z',
    userId: 'usr_004',
    userName: 'Juliana Alves',
    agentName: null,
    action: 'Tentativa de login',
    result: 'Acesso bloqueado — conta suspensa',
    type: 'login_blocked',
  },
  {
    id: 'act_010',
    timestamp: '2025-06-08T16:45:00Z',
    userId: 'usr_001',
    userName: 'Eduardo Silva',
    agentName: 'Acelerador de Budget',
    action: 'Executou regra "Escalar budget de top performers"',
    result: 'Orçamento da campanha "Leads — Webinar" escalado em 25%',
    type: 'rule_execution',
  },
]

// Configurações de planos do admin
export const adminPlansConfig = [
  {
    id: 'starter',
    name: 'Starter',
    price: 197.00,
    maxAgents: 2,
    maxRules: 5,
    maxCampaigns: 10,
    usersCount: 2,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 497.00,
    maxAgents: 10,
    maxRules: 25,
    maxCampaigns: 50,
    usersCount: 2,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1497.00,
    maxAgents: 999,
    maxRules: 999,
    maxCampaigns: 999,
    usersCount: 1,
  },
]

// Configurações globais do sistema
export const adminSystemConfig = {
  maintenanceMode: false,
  globalMessage: '',
  emailFrom: 'noreply@gespub.ai',
  emailSmtp: 'smtp.sendgrid.net',
  emailPort: 587,
}
