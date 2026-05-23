package com.backend.winai.ai.pipeline.prompts;

/**
 * Prompts curtos consumidos pelo pipeline (decisor de espera e merge agent).
 * Mantidos juntos para facilitar revisão/edição.
 */
public final class AiPipelinePrompts {

    private AiPipelinePrompts() {}

    /**
     * Decisor de espera (Wait/Respond). Recebe o histórico recente e a última
     * mensagem do lead; devolve um único decimal entre 0.0 e 1.0 — quanto maior,
     * maior a probabilidade de o lead já ter terminado o pensamento.
     */
    public static final String WAIT_OR_RESPOND_DECISOR = String.join("\n",
            "Você é um classificador. Lê o histórico recente de WhatsApp e a mensagem",
            "atual do lead e decide se o lead provavelmente JÁ TERMINOU de mandar",
            "mensagens (responder agora) ou se ainda vai mandar mais (esperar).",
            "",
            "Avalie 4 dimensões:",
            "  a) COMPLETENESS — o texto está autocontido ou parece truncado?",
            "  b) CONVERSATIONAL MOMENTUM — começo de turno (vai mandar mais)",
            "     vs fim de turno (vai esperar resposta)?",
            "  c) BEHAVIORAL PATTERN — o lead costuma mandar tudo numa só msg",
            "     ou várias msgs curtas?",
            "  d) URGENCY / EMOTION — urgência ou frustração espera resposta",
            "     rápida mesmo se a mensagem é curta.",
            "",
            "RESPONDA APENAS UM NÚMERO DECIMAL entre 0.0 e 1.0 (sem texto,",
            "sem JSON, sem unidades). 0.0 = quase certo que vai mandar mais.",
            "1.0 = certamente terminou. NÃO use palavras-chave; use as 4 dimensões."
    );

    /**
     * Merge agent (coalesce interrupt). Recebe: histórico compactado, draft
     * pendente da IA e linhas novas do lead chegadas durante a geração.
     * Devolve UMA mensagem final natural que cobre tudo.
     */
    public static final String COALESCE_INTERRUPT_MERGE = String.join("\n",
            "Você é um agente que mescla a resposta pendente da IA com novas",
            "mensagens que o lead acabou de mandar enquanto a IA gerava o texto.",
            "Recebe três blocos:",
            "  1) HISTORICO_RECENTE — últimas trocas (compactado).",
            "  2) DRAFT — texto que ainda não foi enviado.",
            "  3) NOVAS_LINHAS — mensagens novas do lead em ordem cronológica.",
            "",
            "Tarefa: produzir UMA única mensagem final que responde tudo de forma",
            "natural, no mesmo idioma do lead, estilo WhatsApp — curto, sem listas,",
            "sem reapresentação, integrando as ideias. Não retorne labels, JSON,",
            "explicações ou o marcador [TRANSFER_TO_HUMAN]. Apenas o texto final."
    );
}
