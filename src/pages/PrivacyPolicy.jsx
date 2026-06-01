import { Link } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface-bg px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <img src="/favicon.svg" alt="GesPub.ai" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-bold text-txt-primary">
            GesPub<span className="text-brand-500">.ai</span>
          </span>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-txt-secondary hover:text-brand-500 transition-colors mt-4 mb-8"
        >
          <IconArrowLeft size={16} />
          Voltar ao login
        </Link>

        <div className="bg-white border border-border rounded-card p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">Política de Privacidade</h1>
            <p className="text-sm text-txt-secondary mt-2">Última atualização: 31 de maio de 2025</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">1. Quem somos</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              A <strong className="text-txt-primary">GesPub.ai</strong> é uma plataforma de gestão inteligente de anúncios digitais,
              operada por Eduardo Eustáquio, com sede no Brasil. Nosso serviço permite que gestores de tráfego e
              anunciantes visualizem métricas, gerenciem campanhas e automatizem ações em contas do Meta Ads
              (Facebook e Instagram).
            </p>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Contato: <a href="mailto:contato@gespub.online" className="text-brand-500 hover:underline">contato@gespub.online</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">2. Quais dados coletamos</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">Coletamos apenas os dados necessários para operar o serviço:</p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Dados de conta:</strong> nome, e-mail e senha (gerenciados pelo Supabase Auth com criptografia)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Token de acesso Meta:</strong> o token OAuth que você autoriza ao conectar sua conta de anúncios, necessário para buscar métricas e executar ações</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Dados de campanhas:</strong> nomes, orçamentos, métricas de desempenho (impressões, cliques, gastos, conversões) obtidos via Meta Graph API</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Configurações de agentes:</strong> regras de automação que você cria dentro da plataforma</span>
              </li>
            </ul>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Não coletamos dados de pagamento, documentos pessoais, dados de menores ou qualquer informação
              além do estritamente necessário para o funcionamento do serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">3. Como usamos seus dados</h2>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Exibir métricas e relatórios das suas campanhas de anúncios</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Executar ações nas suas campanhas conforme as regras que você configurou (pausar, alterar orçamento)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Enviar notificações sobre eventos importantes nas suas campanhas</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Autenticar sua sessão e manter a segurança da conta</span>
              </li>
            </ul>
            <p className="text-sm text-txt-secondary leading-relaxed">
              <strong className="text-txt-primary">Não usamos seus dados para:</strong> publicidade própria,
              treinamento de modelos de IA externos, análise de comportamento para fins comerciais ou qualquer
              finalidade além das listadas acima.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">4. Compartilhamento de dados</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Seus dados <strong className="text-txt-primary">não são vendidos, alugados ou compartilhados</strong> com terceiros
              para fins comerciais. Utilizamos os seguintes provedores de infraestrutura, cada um com seus próprios
              padrões de segurança:
            </p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Supabase:</strong> banco de dados e autenticação (servidores na AWS, região us-east-1)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Vercel:</strong> hospedagem da aplicação web</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span><strong className="text-txt-primary">Meta Platforms:</strong> as chamadas à Graph API são feitas diretamente ao servidor da Meta com o seu token autorizado</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">5. Retenção e exclusão de dados</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Seus dados são mantidos enquanto sua conta estiver ativa. Ao desconectar sua conta Meta (botão
              "Desconectar" em Conexões), o token de acesso é imediatamente excluído do nosso banco de dados.
            </p>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Para excluir completamente sua conta e todos os dados associados, envie uma solicitação para{' '}
              <a href="mailto:contato@gespub.online" className="text-brand-500 hover:underline">contato@gespub.online</a>.
              Processamos exclusões em até 7 dias úteis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">6. Dados do Meta / Facebook</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Quando você conecta sua conta Meta, autorizamos as permissões <code className="bg-surface-bg px-1.5 py-0.5 rounded text-xs font-mono">ads_management</code> e{' '}
              <code className="bg-surface-bg px-1.5 py-0.5 rounded text-xs font-mono">pages_read_engagement</code> exclusivamente para operar as funcionalidades da plataforma.
            </p>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Você pode revogar essas permissões a qualquer momento em:{' '}
              <strong className="text-txt-primary">Facebook → Configurações → Aplicativos e sites → GesPub.ai → Remover</strong>.
              Isso encerrará o acesso da plataforma aos seus dados de anúncios.
            </p>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Cumprimos integralmente os{' '}
              <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                Termos de Plataforma do Meta
              </a>{' '}
              e a{' '}
              <a href="https://developers.facebook.com/policy/" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                Política de Dados do Desenvolvedor
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">7. Segurança</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Implementamos medidas técnicas para proteger seus dados:
            </p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Comunicações via HTTPS/TLS em todas as requisições</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Isolamento por usuário com Row Level Security (RLS) no banco de dados</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Autenticação gerenciada pelo Supabase com senhas criptografadas</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-500 font-bold shrink-0">•</span>
                <span>Acesso à plataforma somente por convite</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">8. Seus direitos (LGPD)</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Confirmar a existência de tratamento dos seus dados</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Acessar os dados que temos sobre você</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Corrigir dados incompletos ou inexatos</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Solicitar a exclusão dos seus dados</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Revogar o consentimento a qualquer momento</span></li>
            </ul>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Para exercer qualquer direito, entre em contato: <a href="mailto:contato@gespub.online" className="text-brand-500 hover:underline">contato@gespub.online</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">9. Alterações nesta política</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Podemos atualizar esta política periodicamente. Quando fizermos alterações significativas,
              notificaremos você por e-mail ou por aviso na plataforma. A data de "última atualização"
              no topo deste documento indica quando a versão vigente foi publicada.
            </p>
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-txt-secondary">
          © {new Date().getFullYear()} GesPub.ai — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
