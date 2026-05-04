package com.backend.winai.service.strategic;

/**
 * Valores iniciais do diagnóstico estratégico / playbook (novas linhas em {@link com.backend.winai.service.StrategicDiagnosisService}).
 * Cliente admin carrega o rascunho publicado pela API; este JSON é o padrão quando ainda não há atividades salvas.
 */
public final class StrategicDiagnosisDefaults {

    public static final String EMPTY_ANSWERS_JSON = "{}";

    /**
     * Playbook 90 dias: prazos curtos (1–5 dias úteis na maioria), em sequência, para o Gantt refletir
     * dependências reais. Go-live Meta/Google como marcos explícitos após plano de mídia e setup.
     */
    public static final String DEFAULT_ACTIVITIES_JSON = """
            [
              {"id":"1","category":"PRODUTO","title":"Recolhimento dos Acessos","start":1,"duration":2,"status":"completed","description":"Coleta de logins e senhas; prazo curto para destravar o restante do cronograma."},
              {"id":"2","category":"PRODUTO","title":"Planejamento de Campanhas","start":3,"duration":2,"status":"completed","description":"Marcos do trimestre em sequência (sem sobreposição amplia artificial); alinhamento de expectativas e ritmo de entregas."},
              {"id":"3","category":"PRODUTO","title":"Análise dos Competidores + Documentação das Estratégias","start":5,"duration":5,"status":"in_progress","description":"Estudo da concorrência e registro das estratégias; pode rodar em blocos de alguns dias."},
              {"id":"4","category":"PRODUTO","title":"Desenvolvimento do Método Único","start":10,"duration":5,"status":"in_progress","description":"Metodologia exclusiva alinhada ao posicionamento; entrega incremental."},
              {"id":"5","category":"PRODUTO","title":"Instrução de Posicionamento de Alto Valor (Bio, Destaques e Post Fixos)","start":15,"duration":3,"status":"in_progress","description":"Otimização do perfil para autoridade; tarefa mais enxuta após direção clara."},
              {"id":"6","category":"ESTRUTURA, FERRAMENTAS E VENDAS","title":"Alinhamento Comercial | Processos e Dinâmica da coleta de dados","start":18,"duration":2,"status":"planned","description":"Como o time comercial registra e alimenta dados antes da coleta histórica."},
              {"id":"7","category":"ESTRUTURA, FERRAMENTAS E VENDAS","title":"Coleta de dados dos últimos 3 a 6 meses","start":20,"duration":5,"status":"planned","description":"Levantamento histórico para análise; prazo proporcional ao volume."},
              {"id":"8","category":"MARKETING E PERFORMANCE","title":"Análise de Mídias Sociais e Definição de Estratégia de Posicionamento","start":26,"duration":4,"status":"planned","description":"Auditoria e direção de redes; antecede tronco e linha editorial."},
              {"id":"9","category":"MARKETING E PERFORMANCE","title":"Tronco de conteúdo para as Redes Sociais","start":30,"duration":3,"status":"planned","description":"Pilares de conteúdo após a estratégia de posicionamento."},
              {"id":"10","category":"MARKETING E PERFORMANCE","title":"Linha editorial (Feed, stories)","start":34,"duration":4,"status":"planned","description":"Calendário de postagens alinhado ao tronco."},
              {"id":"11","category":"MARKETING E PERFORMANCE","title":"Script (TOPO, MEIO, FUNDO) de funil","start":38,"duration":3,"status":"planned","description":"Roteiros por etapa da jornada."},
              {"id":"12","category":"MARKETING E PERFORMANCE","title":"Fluxograma do Funil de Vendas Online","start":41,"duration":2,"status":"planned","description":"Mapa visual do fluxo até a compra."},
              {"id":"13","category":"MARKETING E PERFORMANCE","title":"Plano de Mídia (Investimento e calendário de ativação)","start":43,"duration":3,"status":"planned","description":"Distribuição de orçamento e regras de investimento. O entregável deve deixar explícitas as datas previstas de início (go-live) das campanhas **Meta Ads** e **Google Ads**, critérios de aprovação de criativos e dependências antes da ativação."},
              {"id":"14","category":"MARKETING E PERFORMANCE","title":"Configuração Inicial — Contas de Anúncios e Rastreamento","start":46,"duration":3,"status":"planned","description":"Pixels, tags, conversões e estrutura de contas antes da primeira veiculação."},
              {"id":"15","category":"MARKETING E PERFORMANCE","title":"Ativação — Campanhas Meta Ads","start":49,"duration":2,"status":"planned","description":"Publicação e ativação das campanhas Meta conforme data acordada no plano de mídia (aprovações, URL, orçamento inicial)."},
              {"id":"16","category":"MARKETING E PERFORMANCE","title":"Ativação — Campanhas Google Ads","start":51,"duration":2,"status":"planned","description":"Publicação e ativação das campanhas Google conforme data acordada no plano de mídia (estrutura, palavras-chave e públicos, orçamento inicial)."},
              {"id":"17","category":"MARKETING E PERFORMANCE","title":"Página de Vendas (Estrutura, Texto, Design e Implementação)","start":53,"duration":5,"status":"planned","description":"Página focada em conversão; pode rodar em paralelo ao fechamento de mídia se já houver copy aprovada."},
              {"id":"18","category":"MARKETING E PERFORMANCE","title":"Relatório semanal — modelo e primeira rodada","start":58,"duration":3,"status":"planned","description":"Definir formato, KPIs e envio do primeiro relatório; o ritmo semanal segue acordado com o cliente nos 90 dias."},
              {"id":"19","category":"RELACIONAMENTO COM CLIENTE E COMUNIDADE","title":"Otimização no Processo de Indicação","start":61,"duration":3,"status":"planned","description":"Incentivos e fluxo para indicações após base estável de atendimento."},
              {"id":"20","category":"MARKETING E PERFORMANCE","title":"Escala — Otimização contínua de campanhas e criativos","start":64,"duration":12,"status":"planned","description":"Bloco de otimização após go-live; ajustes de orçamento, públicos e criativos com base em performance."},
              {"id":"21","category":"MARKETING E PERFORMANCE","title":"Escala — Revisão de KPIs e retrospectiva do trimestre","start":76,"duration":7,"status":"planned","description":"Consolidação do que funcionou e foco até o fechamento dos 90 dias."},
              {"id":"22","category":"PRODUTO","title":"Escala — Roadmap e prioridades pós-playbook (próximo ciclo)","start":83,"duration":8,"status":"planned","description":"Entregas e metas imediatas após o período de consultoria."}
            ]
            """;

    private StrategicDiagnosisDefaults() {
    }
}
