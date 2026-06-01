// ADIM — Logs & Atividade
import { useState } from 'react'
import { IconDownload } from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { adminActivityFeed } from '../../mock/adminData'
import { mockUsers } from '../../mock/users'
import { formatDateTime } from '../../utils/formatters'

export default function AdminLogs() {
  const [userFilter, setUserFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Opções de filtro
  const userOptions = mockUsers
    .filter((u) => u.role !== 'admin')
    .map((u) => ({ id: u.id, label: u.name }))

  const typeOptions = [
    { id: 'rule_execution', label: 'Execução de regra' },
    { id: 'sync', label: 'Sincronização' },
    { id: 'login', label: 'Login' },
    { id: 'login_blocked', label: 'Login bloqueado' },
    { id: 'campaign_action', label: 'Ação de campanha' },
  ]

  // Filtrar atividades
  const filteredActivities = adminActivityFeed.filter((a) => {
    if (userFilter && a.userId !== userFilter) return false
    if (typeFilter && a.type !== typeFilter) return false
    return true
  })

  // Tipo de ação para badge
  const actionTypeBadge = {
    rule_execution: { label: 'Regra', variant: 'brand' },
    sync: { label: 'Sinc.', variant: 'success' },
    login: { label: 'Login', variant: 'default' },
    login_blocked: { label: 'Bloqueado', variant: 'error' },
    campaign_action: { label: 'Campanha', variant: 'warning' },
  }

  // Export CSV (mock)
  const handleExportCsv = () => {
    // No MVP, apenas simula o download
    const csvContent = 'timestamp,usuario,agente,acao,resultado,tipo\n' +
      filteredActivities.map((a) =>
        `${a.timestamp},${a.userName},${a.agentName || ''},${a.action},${a.result},${a.type}`
      ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'gespub-logs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filtros e export */}
      <div className="flex flex-wrap items-end gap-4">
        <Select
          name="userFilter"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          options={userOptions}
          placeholder="Todos os usuários"
          className="w-56"
        />
        <Select
          name="typeFilter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={typeOptions}
          placeholder="Todos os tipos"
          className="w-56"
        />
        <div className="flex-1" />
        <Button variant="secondary" onClick={handleExportCsv} icon={IconDownload}>
          Exportar CSV
        </Button>
      </div>

      {/* Feed de logs */}
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide">Timestamp</th>
              <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide">Usuário</th>
              <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide">Agente</th>
              <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide">Ação</th>
              <th className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide">Resultado</th>
              <th className="text-center text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.map((activity) => (
              <tr
                key={activity.id}
                className="border-b border-border last:border-0 hover:bg-surface-bg transition-all duration-150"
              >
                <td className="px-4 py-3">
                  <p className="text-xs text-txt-secondary font-mono">{formatDateTime(activity.timestamp)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-txt-primary">{activity.userName}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-brand-500">{activity.agentName || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-txt-primary">{activity.action}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-txt-secondary">{activity.result}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={actionTypeBadge[activity.type]?.variant}>
                    {actionTypeBadge[activity.type]?.label}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
