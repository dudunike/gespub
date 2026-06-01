// Dados mockados de notificações

export const mockNotifications = [
  {
    id: 'notif_001',
    title: 'ROAS alto detectado',
    message: 'Campanha "Remarketing" atingiu ROAS de 7.0×. Agente "Guardião de ROAS" sugere escalar.',
    type: 'success',
    read: false,
    createdAt: '2025-06-10T14:30:00Z',
  },
  {
    id: 'notif_002',
    title: 'CPA acima do limite',
    message: 'Anúncio "Frete grátis" pausado automaticamente pelo agente "Sentinela de CPA".',
    type: 'warning',
    read: false,
    createdAt: '2025-06-10T08:15:00Z',
  },
  {
    id: 'notif_003',
    title: 'Fadiga criativa detectada',
    message: 'Criativo "Carrossel — Top 5 Produtos" com frequência 2.8. Considere atualizar.',
    type: 'warning',
    read: true,
    createdAt: '2025-06-09T22:00:00Z',
  },
  {
    id: 'notif_004',
    title: 'Orçamento próximo do limite',
    message: 'Campanha "Black Friday 2025" já consumiu 56% do orçamento total.',
    type: 'error',
    read: true,
    createdAt: '2025-06-10T07:00:00Z',
  },
  {
    id: 'notif_005',
    title: 'Sincronização Meta Ads concluída',
    message: 'Dados atualizados com sucesso. 6 campanhas sincronizadas.',
    type: 'success',
    read: true,
    createdAt: '2025-06-10T14:00:00Z',
  },
]
