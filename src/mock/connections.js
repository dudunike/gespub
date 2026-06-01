// Dados mockados de conexões/integrações

export const mockConnections = [
  {
    id: 'conn_001',
    name: 'Meta Ads',
    description: 'Gerencie suas campanhas no Facebook e Instagram Ads diretamente pela plataforma.',
    icon: 'facebook',
    status: 'connected',
    enabled: true,
    details: {
      accountName: 'Conta Ads — Eduardo Silva',
      accountId: 'act_123456789',
      lastSync: '2025-06-10T14:00:00Z',
      campaigns: 6,
    },
  },
  {
    id: 'conn_002',
    name: 'Gemini AI',
    description: 'Inteligência artificial para análise, insights e otimização automática de campanhas.',
    icon: 'gemini',
    status: 'connected',
    enabled: true,
    details: {
      apiKey: 'AIza••••••••••••••••',
      model: 'gemini-2.0-flash',
      lastUsed: '2025-06-10T13:45:00Z',
      requestsToday: 47,
    },
  },
  {
    id: 'conn_003',
    name: 'Google Ads',
    description: 'Conecte suas campanhas do Google Ads para gestão unificada.',
    icon: 'google',
    status: 'coming_soon',
    enabled: false,
    details: null,
  },
  {
    id: 'conn_004',
    name: 'TikTok Ads',
    description: 'Gerencie anúncios no TikTok com automação inteligente.',
    icon: 'tiktok',
    status: 'coming_soon',
    enabled: false,
    details: null,
  },
]
