// ADIM — Agentes & Regras Globais
import Badge from '../../components/ui/Badge'
import { mockAgents } from '../../mock/agents'
import { mockRules } from '../../mock/rules'
import { mockUsers } from '../../mock/users'
import { METRICS, RULE_ACTIONS } from '../../utils/constants'

export default function AdminAgentsRules() {
  const clientUsers = mockUsers.filter((u) => u.role !== 'admin')

  // Agentes com mais execuções
  const topAgents = [...mockAgents].sort((a, b) => b.totalExecutions - a.totalExecutions)

  // Regras mais executadas
  const topRules = [...mockRules].sort((a, b) => b.totalExecutions - a.totalExecutions)

  // Contagem de ações mais realizadas
  const actionCounts = {}
  mockRules.forEach((rule) => {
    const actionLabel = RULE_ACTIONS.find((a) => a.id === rule.action)?.label || rule.action
    actionCounts[actionLabel] = (actionCounts[actionLabel] || 0) + rule.totalExecutions
  })
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {/* Grid de cards de resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agentes por usuário */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">
            Agentes por usuário
          </h2>
          <div className="space-y-3">
            {clientUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-sm text-txt-primary">{user.name}</p>
                <Badge variant="brand">{user.agents || 0} agentes</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Agentes com mais execuções */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">
            Agentes mais ativos
          </h2>
          <div className="space-y-3">
            {topAgents.map((agent, i) => (
              <div key={agent.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-txt-secondary w-5">#{i + 1}</span>
                  <p className="text-sm text-txt-primary">{agent.name}</p>
                </div>
                <Badge variant="default">{agent.totalExecutions} exec.</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Ações mais realizadas */}
        <div className="bg-white border border-border rounded-card p-5">
          <h2 className="text-sm font-semibold text-txt-primary mb-4">
            Ações mais realizadas
          </h2>
          <div className="space-y-3">
            {topActions.map(([action, count], i) => (
              <div key={action} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-txt-secondary w-5">#{i + 1}</span>
                  <p className="text-sm text-txt-primary">{action}</p>
                </div>
                <Badge variant="default">{count} vezes</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regras mais executadas */}
      <div className="bg-white border border-border rounded-card p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold text-txt-primary mb-4 whitespace-nowrap">
          Regras mais executadas globalmente
        </h2>
        <div className="space-y-3 min-w-[700px]">
          {topRules.map((rule, i) => (
            <div key={rule.id} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              <span className="text-xs font-medium text-txt-secondary w-5">#{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-txt-primary">{rule.name}</p>
                <p className="text-xs text-txt-secondary font-mono">{rule.condition}</p>
              </div>
              <p className="text-sm text-brand-500 font-medium">{rule.agentName}</p>
              <Badge variant="brand">{rule.totalExecutions} execuções</Badge>
              <Badge variant={rule.isActive ? 'success' : 'default'}>
                {rule.isActive ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
