import { Link } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

export default function TermsOfUse() {
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
            <h1 className="text-2xl font-bold text-txt-primary">Termos de Uso</h1>
            <p className="text-sm text-txt-secondary mt-2">Última atualização: 31 de maio de 2025</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">1. Aceitação dos termos</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Ao acessar e utilizar a plataforma <strong className="text-txt-primary">GesPub.ai</strong> (disponível em gespub.online),
              você concorda integralmente com estes Termos de Uso e com nossa{' '}
              <Link to="/politica-de-privacidade" className="text-brand-500 hover:underline">Política de Privacidade</Link>.
              Se não concordar com qualquer parte, não utilize o serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">2. Descrição do serviço</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              A GesPub.ai é uma plataforma de gestão inteligente de anúncios digitais que permite:
            </p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Conectar contas de anúncios do Meta Ads (Facebook e Instagram) via OAuth</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Visualizar métricas e relatórios de desempenho de campanhas</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Gerenciar campanhas, conjuntos de anúncios e anúncios</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Configurar agentes de automação baseados em regras e métricas</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Receber insights e análises sobre o desempenho das campanhas</span></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">3. Acesso por convite</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              O acesso à GesPub.ai é <strong className="text-txt-primary">restrito e concedido por convite</strong>.
              Contas são criadas exclusivamente pelo administrador da plataforma. Não há cadastro público.
              Ao receber acesso, você é responsável por manter a confidencialidade das suas credenciais e por
              todas as ações realizadas na sua conta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">4. Uso aceitável</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">Você concorda em usar a plataforma apenas para fins legítimos de gestão de anúncios. É proibido:</p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Compartilhar suas credenciais de acesso com terceiros</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Usar a plataforma para gerenciar contas de anúncios sem autorização do titular</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Tentar acessar dados de outros usuários ou sistemas não autorizados</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Realizar atividades que violem as políticas do Meta Ads ou legislação vigente</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Fazer engenharia reversa ou copiar qualquer parte do software</span></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">5. Conexão com Meta Ads</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Ao conectar sua conta Meta, você autoriza a GesPub.ai a acessar e gerenciar seus dados de anúncios
              conforme as permissões concedidas. Você permanece o titular e responsável pela conta de anúncios.
              A GesPub.ai age exclusivamente sob sua instrução e configuração.
            </p>
            <p className="text-sm text-txt-secondary leading-relaxed">
              As automações e ações executadas pelos agentes (pausar campanhas, alterar orçamentos) são realizadas
              com base nas regras que <strong className="text-txt-primary">você mesmo configurou</strong>.
              A GesPub.ai não se responsabiliza por resultados de campanhas decorrentes das automações configuradas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">6. Limitação de responsabilidade</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              A GesPub.ai é fornecida "como está". Não garantimos resultados específicos de campanhas ou
              disponibilidade ininterrupta do serviço. Em nenhum caso seremos responsáveis por:
            </p>
            <ul className="space-y-2 text-sm text-txt-secondary">
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Perdas financeiras decorrentes de decisões de campanha tomadas com base nas informações da plataforma</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Interrupções de serviço causadas por indisponibilidade da API do Meta</span></li>
              <li className="flex gap-2"><span className="text-brand-500 font-bold shrink-0">•</span><span>Ações executadas pelas automações que você configurou</span></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">7. Planos e pagamentos</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Os planos e condições de pagamento são definidos individualmente no momento da contratação.
              O não pagamento pode resultar na suspensão do acesso. Para dúvidas sobre cobrança, entre em contato
              em <a href="mailto:contato@gespub.online" className="text-brand-500 hover:underline">contato@gespub.online</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">8. Encerramento de conta</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Você pode solicitar o encerramento da sua conta a qualquer momento pelo e-mail{' '}
              <a href="mailto:contato@gespub.online" className="text-brand-500 hover:underline">contato@gespub.online</a>.
              Reservamo-nos o direito de suspender contas que violem estes termos, sem aviso prévio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">9. Legislação aplicável</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
              comarca de Belo Horizonte/MG para dirimir quaisquer controvérsias, com renúncia expressa a
              qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-txt-primary">10. Contato</h2>
            <p className="text-sm text-txt-secondary leading-relaxed">
              Dúvidas sobre estes Termos ou sobre a plataforma:{' '}
              <a href="mailto:contato@gespub.online" className="text-brand-500 hover:underline">contato@gespub.online</a>
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
