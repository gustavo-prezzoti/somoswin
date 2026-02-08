-- Migração para criar tabelas de Termos de Serviço
-- V6__Create_Terms_Of_Service_Tables.sql

-- Tabela de versões dos termos de serviço
CREATE TABLE IF NOT EXISTS winai.terms_of_service (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar termos ativos rapidamente
CREATE INDEX IF NOT EXISTS idx_terms_of_service_active ON winai.terms_of_service(active) WHERE active = true;

-- Tabela de aceites dos usuários
CREATE TABLE IF NOT EXISTS winai.user_terms_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES winai.users(id) ON DELETE CASCADE,
    terms_of_service_id UUID NOT NULL REFERENCES winai.terms_of_service(id) ON DELETE CASCADE,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    CONSTRAINT uk_user_terms UNIQUE (user_id, terms_of_service_id)
);

-- Índices para buscas comuns
CREATE INDEX IF NOT EXISTS idx_user_terms_acceptances_user_id ON winai.user_terms_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_terms_acceptances_terms_id ON winai.user_terms_acceptances(terms_of_service_id);

-- Inserir a primeira versão dos termos de serviço
INSERT INTO winai.terms_of_service (version, content, active)
VALUES ('1.0', 
'TERMO DE ACEITE

PARTES
CONTRATADA: WIN GESTÃO DE MIDIAS SOCIAIS LTDA
CNPJ: 53.269.771/0001-45
Endereço: AV. DOM PEDRO II, 3210 – SANTA RITA – LAGES
E-mail: contato@somoswin.com.br
CONTRATANTE: [Nome/Razão Social]
CNPJ/CPF: [Documento]
E-mail: [E-mail]

1. OBJETO DO SERVIÇO
Ao aceitar este termo, você contrata serviços de aceleração comercial através de um ecossistema de 4 Inteligências Artificiais:
•IA de Tráfego Pago: Gestão e otimização de campanhas Meta Ads
•IA de Social Growth: Estratégia de crescimento orgânico e conteúdo
•IA de Atendimento: Atendimento 24/7 via WhatsApp com qualificação de leads
•IA de Estruturação Comercial: Consultoria estratégica (planos Growth/Scale)
Incluído: Dashboard, Academia de Vendas, Suporte técnico conforme plano.
2. PLANO E VALORES
Plano Contratado: 
Mensalidade: 
Taxa de Setup: 
Implementação: 
Vencimento: 

3. GARANTIA DE SATISFAÇÃO (7 DIAS)
✅ Você tem 7 dias corridos após a implementação completa para cancelar com reembolso total, incluindo a taxa de setup.

Como cancelar: Envie e-mail para contato@somoswin.com.br indicando os motivos.
Reembolso: Processado em até 10 dias úteis.
⚠️ APÓS os 7 dias: Taxa de setup não é mais reembolsável.

4. O QUE A WIN FAZ
✅Implementa e configura o sistema em 7-10 dias úteis
✅Estrutura e otimiza campanhas de tráfego pago
✅Capta e qualifica leads automaticamente 24/7
✅Fornece dashboard com métricas em tempo real
✅Oferece suporte técnico (resposta em até 48h - plano Starter)
✅Grava todas as sessões estratégicas (disponíveis por 90 dias)
✅Mantém sistema funcionando com 99% uptime mínimo
5. O QUE VOCÊ PRECISA FAZER
IMPORTANTE: O sucesso depende da sua atuação. Você é responsável por:

•Investimento em Tráfego: Pagar 100% dos anúncios no Meta Ads (a WIN gerencia, você paga)
•Fornecer Informações: Dados do negócio, acessos (Meta, WhatsApp, Instagram, Facebook)
•Fechar Vendas: Atender reuniões com leads qualificados e executar o processo de vendas
•Qualidade da Oferta: Garantir que seu produto/serviço é competitivo e de qualidade
•Colaboração: Implementar recomendações, fornecer feedbacks, participar de sessões estratégicas

6. O QUE A WIN NÃO GARANTE
❌Número específico de vendas fechadas
❌Faturamento mínimo ou máximo
❌Taxa de conversão específica
❌ROI (Retorno sobre Investimento) determinado
❌Custo por lead específico
❌Resultados em prazo determinado

POR QUÊ? Porque o resultado final de vendas depende de múltiplos fatores sob SEU controle:
•Qualidade e preço da sua oferta
•Capacidade da sua equipe de vendas
•Reputação da sua marca
•Contexto econômico e mercado
•Capacidade de entrega do que você vende

A WIN fornece ferramentas, leads qualificados e estratégias. VOCÊ fecha as vendas.

7. COMPROMISSO DE MELHORIA CONTÍNUA
Se você:
•Seguir todas as recomendações da WIN
•Mantiver budget adequado de tráfego
•Executar o processo de vendas corretamente
•E ainda assim não ver melhoria nos primeiros 60 dias
A WIN se compromete a:
•Revisar estratégia completa (sem custo adicional)
•Ajustar configurações das IAs
•Realizar sessão intensiva de análise
•Propor novo plano de ação
⚠️ Isto NÃO é garantia de resultado, apenas compromisso de otimização.

8. REEMBOLSO POR INATIVIDADE
Se o sistema ficar inativo por mais de 1 dia útil completo (24h) por falha da WIN:
•Você receberá reembolso proporcional da mensalidade
•Cálculo: (Mensalidade ÷ 30) × dias inativos
9. CANCELAMENTO E VIGÊNCIA
Vigência: 12 meses com renovação automática
Cancelamento: Pode solicitar a qualquer momento com 30 dias de antecedência
Efeitos do cancelamento após 7 dias:
•Mensalidade do mês corrente não é reembolsada
•Taxa de setup não é reembolsável
•Cancelamento efetivado ao final do mês
•Você mantém todos os leads e dados capturados
10. DADOS E PRIVACIDADE (LGPD)
✅A WIN atua como operadora de dados (você é o controlador)
✅Dados são usados apenas para os serviços contratados
✅Medidas de segurança implementadas
✅Seus leads e dados sempre pertencem a você
✅Em caso de incidente de segurança, você será notificado imediatamente
Você autoriza a WIN a tratar os dados necessários para prestação dos serviços.
11. GRAVAÇÃO DE SESSÕES
📹 TODAS as reuniões e sessões estratégicas serão gravadas para fins de:
•Registro e controle de qualidade
•Referência futura para você
•Evidência de recomendações fornecidas

Gravações disponíveis por 90 dias.
Ao aceitar este termo, você autoriza expressamente estas gravações.

12. RESOLUÇÃO DE CONFLITOS
Em caso de divergências:
1.Primeiro: Tentativa de negociação direta de boa-fé
2.Segundo: Mediação com mediador certificado (custos divididos)
3.Último recurso: Foro da comarca de Lages/SC
13. DOCUMENTO DE EXPECTATIVAS REALISTAS
Antes de aceitar, você receberá (ou já recebeu) um documento contendo:
•Casos de sucesso de clientes anteriores
•Casos de insucesso e motivos
•Fatores que influenciam resultados
•Expectativas realistas por tipo de negócio
Este documento é parte integrante deste termo.
14. LIMITAÇÕES IMPORTANTES
A WIN NÃO é responsável por:
•Quedas de serviços de terceiros (Meta, WhatsApp, etc.)
•Mudanças em políticas de plataformas de anúncios
•Reprovação de anúncios pelas plataformas
•Eventos de força maior (pandemias, desastres, etc.)
•Lucros cessantes ou danos indiretos
Responsabilidade financeira limitada ao valor pago nos últimos 3 meses.
15. REAJUSTE E ALTERAÇÕES
•Reajuste anual: IGPM (comunicado 30 dias antes)
•Mudanças de preço/planos: Comunicadas 60 dias antes (aplicáveis apenas em renovações)
•Alterações no sistema: Melhorias automáticas / Mudanças negativas comunicadas 15 dias antes

DECLARAÇÃO DE ACEITE
Ao aceitar este termo, você declara que:
✅Leu e compreendeu TODAS as cláusulas deste termo
✅Recebeu e leu o documento de casos e expectativas realistas
✅Compreende que a WIN presta serviços de GESTÃO, não garante vendas ou faturamento
✅Está ciente de suas responsabilidades (investimento, vendas, colaboração)
✅Tem capacidade financeira para investir em tráfego pago
✅Tem equipe/capacidade de fechar vendas dos leads qualificados
✅Autoriza a gravação de reuniões e sessões estratégicas
✅Não foi induzido a erro ou coagido a aceitar este termo
ACEITE ELETRÔNICO
Data do Aceite: [Gerado automaticamente pela plataforma]
IP: [Capturado automaticamente pela plataforma]
Assinatura Eletrônica: Ao clicar em "Aceito", você concorda com todos os termos acima.

WIN GESTÃO DE MÍDIAS SOCIAIS LTDA
CNPJ: 53.269.771/0001-45
contato@somoswin.com.br
Em caso de dúvidas, entre em contato ANTES de aceitar.', 
true)
ON CONFLICT (version) DO NOTHING;
