package com.backend.winai.service.strategic;

/**
 * Atividades iniciais idênticas ao {@code useState} inicial de StrategicDiagnosis.tsx (painel-admin).
 */
public final class StrategicDiagnosisDefaults {

    public static final String EMPTY_ANSWERS_JSON = "{}";

    public static final String DEFAULT_ACTIVITIES_JSON = """
            [
              {"id":"1","category":"PRODUTO","title":"Recolhimento dos Acessos","start":1,"duration":7,"status":"completed","description":"Coleta de todos os logins e senhas necessários para iniciar o projeto."},
              {"id":"2","category":"PRODUTO","title":"Planejamento","start":1,"duration":7,"status":"completed","description":"Definição do cronograma e alinhamento de expectativas."},
              {"id":"3","category":"PRODUTO","title":"Análise dos Competidores + Documentação das Estratégias","start":1,"duration":14,"status":"in_progress","description":"Estudo detalhado da concorrência e mapeamento de oportunidades."},
              {"id":"4","category":"PRODUTO","title":"Desenvolvimento do Método Único","start":8,"duration":14,"status":"in_progress","description":"Criação da metodologia exclusiva que diferencia o produto no mercado."},
              {"id":"5","category":"PRODUTO","title":"Posicionamento de Alto Valor (Bio, Destaques e Post Fixos)","start":8,"duration":14,"status":"in_progress","description":"Otimização do perfil para transmitir autoridade e valor."},
              {"id":"6","category":"ESTRUTURA, FERRAMENTAS E VENDAS","title":"Alinhamento Comercial | Processos e Dinâmica da coleta de dados","start":35,"duration":14,"status":"planned","description":"Definição de como os dados serão coletados e processados pelo time comercial."},
              {"id":"7","category":"ESTRUTURA, FERRAMENTAS E VENDAS","title":"Coleta de dados dos ultimos 3 a 6 meses","start":35,"duration":14,"status":"planned","description":"Levantamento histórico para análise de performance e tendências."},
              {"id":"8","category":"MARKETING E PERFORMANCE","title":"Análise de Mídias Sociais e Definição de Estratégia de Posicionamento","start":15,"duration":21,"status":"planned","description":"Auditoria das redes sociais e plano de ação para crescimento."},
              {"id":"9","category":"MARKETING E PERFORMANCE","title":"Tronco de conteúdo","start":15,"duration":21,"status":"planned","description":"Definição dos pilares principais de conteúdo da marca."},
              {"id":"10","category":"MARKETING E PERFORMANCE","title":"Linha editorial (Feed, stories)","start":15,"duration":21,"status":"planned","description":"Planejamento detalhado das postagens diárias e semanais."},
              {"id":"11","category":"MARKETING E PERFORMANCE","title":"Script (TOPO, MEIO, FUNDO) de funil","start":8,"duration":14,"status":"planned","description":"Criação de roteiros para cada etapa da jornada do cliente."},
              {"id":"12","category":"MARKETING E PERFORMANCE","title":"Fluxograma do Funil de Vendas Online","start":8,"duration":14,"status":"planned","description":"Desenho visual de como o lead percorre o funil até a compra."},
              {"id":"13","category":"MARKETING E PERFORMANCE","title":"Plano de Mídia (Investimento nas Ferramentas)","start":8,"duration":14,"status":"planned","description":"Distribuição do orçamento entre Google, Meta e outras plataformas."},
              {"id":"14","category":"MARKETING E PERFORMANCE","title":"Configuração Inicial Contas de Anúncios e Rastreamento","start":8,"duration":14,"status":"planned","description":"Setup técnico de pixels, tags e contas de anúncios."},
              {"id":"15","category":"MARKETING E PERFORMANCE","title":"Página de Venda - (Estrutura, Texto, Design e Implementação)","start":15,"duration":14,"status":"planned","description":"Criação da landing page focada em conversão."},
              {"id":"16","category":"MARKETING E PERFORMANCE","title":"Relatório semanal","start":15,"duration":75,"status":"planned","description":"Acompanhamento constante dos KPIs e ajustes de rota."},
              {"id":"17","category":"RELACIONAMENTO COM CLIENTE E COMUNIDADE","title":"Otimização no Processo de Indicação","start":35,"duration":14,"status":"planned","description":"Criação de incentivos para que clientes atuais indiquem novos."}
            ]
            """;

    private StrategicDiagnosisDefaults() {
    }
}
