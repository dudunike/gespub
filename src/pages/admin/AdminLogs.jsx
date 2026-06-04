// Admin — Logs reais do Supabase com filtros, paginação e export CSV
import { useState, useEffect, useCallback } from 'react'
import { IconDownload, IconRefresh, IconSearch, IconAlertCircle } from '@tabler/icons-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime } from '../../utils/formatters'

const ACTION_CFG = {
  increase_budget:   { label: 'Orçamento ↑',  variant: 'success' },
  decrease_budget:   { label: 'Orçamento ↓',  variant: 'warning' },
  pause_campaign:    { label: 'Pausou camp.',  variant: 'error'   },
  pause_ad:          { label: 'Pausou anúncio',variant: 'error'   },
  send_notification: { label: 'Notificação',   variant: 'brand'   },
  send_email:        { label: 'E-mail',        variant: 'default' },
}

const PAGE_SIZE = 50

export default function AdminLogs() {
  const [logs,       setLogs]       = useState([])
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)

  const [userFilter,   setUserFilter]   = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  // Carrega lista de usuários para o filtro
  useEffect(() => {
    supabase.from('profiles').select('id, name, email').order('name')
      .then(({ data }) => setUsers(data || []))
      .catch(() => {})
  }, [])

  const loadLogs = useCallback(async (pg = 0) => {
    setLoading(true); setError(null)
    try {
      // Busca logs + agentes em uma query (FK agent_id → agents garantida)
      let q = supabase
        .from('agent_logs')
        .select('id, action, message, executed_at, metric_key, metric_value, agent_id, user_id, agents(name, user_id)', { count: 'exact' })
        .order('executed_at', { ascending: false })
        .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1)

      if (userFilter)   q = q.eq('user_id', userFilter)
      if (actionFilter) q = q.eq('action',  actionFilter)
      if (dateFrom)     q = q.gte('executed_at', dateFrom)
      if (dateTo)       q = q.lte('executed_at', dateTo + 'T23:59:59')

      const { data, error: err, count } = await q
      if (err) throw new Error(err.message)

      let rows = data || []

      // Busca perfis dos user_ids únicos separadamente (evita erro de FK não declarada)
      const uids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
      let profileMap = {}
      if (uids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', uids)
        ;(profiles || []).forEach(p => { profileMap[p.id] = p })
      }

      // Injeta perfil em cada log
      rows = rows.map(r => ({ ...r, profile: profileMap[r.user_id] || null }))

      if (search) {
        const s = search.toLowerCase()
        rows = rows.filter(l =>
          l.message?.toLowerCase().includes(s) ||
          l.profile?.name?.toLowerCase().includes(s) ||
          l.profile?.email?.toLowerCase().includes(s) ||
          l.agents?.name?.toLowerCase().includes(s)
        )
      }

      setLogs(rows)
      setTotal(count || 0)
      setPage(pg)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userFilter, actionFilter, search, dateFrom, dateTo])

  useEffect(() => { loadLogs(0) }, [loadLogs])

  const handleExportCSV = () => {
    if (logs.length === 0) return
    const headers = ['Data/Hora', 'Usuário', 'E-mail', 'Agente', 'Ação', 'Mensagem', 'Métrica', 'Valor']
    const rows = logs.map(l => [
      l.executed_at ? new Date(l.executed_at).toLocaleString('pt-BR') : '',
      l.profile?.name  || '',
      l.profile?.email || '',
      l.agents?.name    || '',
      l.action          || '',
      (l.message        || '').replace(/,/g, ' '),
      l.metric_key      || '',
      l.metric_value    || '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `logs-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionOptions = Object.entries(ACTION_CFG).map(([id, { label }]) => ({ id, label }))
  const totalPages    = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="bg-white border border-border rounded-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Busca livre */}
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar mensagem, usuário…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-52"
            />
          </div>

          {/* Usuário */}
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-input focus:outline-none bg-white text-txt-primary w-48">
            <option value="">Todos os usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>

          {/* Ação */}
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-input focus:outline-none bg-white text-txt-primary w-44">
            <option value="">Todas as ações</option>
            {actionOptions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>

          {/* Data de */}
          <div>
            <label className="text-xs text-txt-secondary block mb-0.5">De</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>
          <div>
            <label className="text-xs text-txt-secondary block mb-0.5">Até</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" icon={IconRefresh} onClick={() => loadLogs(0)} disabled={loading}>
              {loading ? 'Carregando…' : 'Atualizar'}
            </Button>
            <Button variant="secondary" size="sm" icon={IconDownload} onClick={handleExportCSV} disabled={logs.length === 0}>
              Exportar CSV
            </Button>
          </div>
        </div>

        <p className="mt-2 text-xs text-txt-secondary">
          {loading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-status-errorBg border border-status-error rounded-input">
          <IconAlertCircle size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-surface-bg rounded animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-txt-secondary">
            <p className="text-sm">Nenhum log encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-surface-bg">
                {['Data / Hora', 'Usuário', 'Agente', 'Ação', 'Mensagem', 'Métrica'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-txt-secondary px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const cfg = ACTION_CFG[log.action] || { label: log.action || '—', variant: 'default' }
                return (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface-bg/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-txt-secondary whitespace-nowrap">
                      {log.executed_at ? formatDateTime(log.executed_at) : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-sm font-medium text-txt-primary truncate">{log.profile?.name || '—'}</p>
                      <p className="text-xs text-txt-secondary truncate">{log.profile?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-secondary whitespace-nowrap max-w-[140px] truncate">
                      {log.agents?.name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-txt-primary max-w-[300px]">
                      <p className="truncate">{log.message || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-txt-secondary whitespace-nowrap">
                      {log.metric_key ? (
                        <span>{log.metric_key.toUpperCase()}: <span className="font-semibold text-txt-primary">{Number(log.metric_value || 0).toFixed(2)}</span></span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-txt-secondary">
            Página {page + 1} de {totalPages} · {total.toLocaleString('pt-BR')} registros
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => loadLogs(page - 1)} disabled={page === 0 || loading}>
              ← Anterior
            </Button>
            <Button variant="secondary" size="sm" onClick={() => loadLogs(page + 1)} disabled={page >= totalPages - 1 || loading}>
              Próxima →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
