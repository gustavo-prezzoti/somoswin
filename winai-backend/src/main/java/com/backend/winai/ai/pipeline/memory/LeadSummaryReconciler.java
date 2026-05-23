package com.backend.winai.ai.pipeline.memory;

import com.backend.winai.service.OpenAiService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadSummaryReconciler {

    private static final int FACTS_CAP = 800;
    private static final int INTENT_CAP = 500;
    private static final double INTENT_SHRINK_THRESHOLD = 0.40;

    private static final Pattern[] FACT_PATTERNS = new Pattern[] {
            Pattern.compile("\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}"),
            Pattern.compile("\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b"),
            Pattern.compile("\\b\\d{5}-?\\d{3}\\b"),
            Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"),
            Pattern.compile("\\(?\\d{2}\\)?\\s?9?\\d{4}-?\\d{4}"),
            Pattern.compile("\\bR\\$\\s*\\d[\\d\\.,]*"),
            Pattern.compile("\\b\\d{9,14}\\b"),
            Pattern.compile("\\bSKU[-\\s:]?\\w+\\b", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\b(?:pedido|protocolo|contrato|nf|nota)\\s*[#nº:]*\\s*\\d{3,}",
                    Pattern.CASE_INSENSITIVE)
    };

    private final OpenAiService openAiService;

    public String reconcileFacts(String oldFacts, String newFacts) {
        if (isBlank(newFacts)) return oldFacts;
        if (isBlank(oldFacts)) return newFacts;

        Set<String> oldTokens = extractTokens(oldFacts);
        Set<String> newTokens = extractTokens(newFacts);

        if (newTokens.containsAll(oldTokens)) {
            return cap(newFacts, FACTS_CAP);
        }

        Set<String> missing = new LinkedHashSet<>(oldTokens);
        missing.removeAll(newTokens);
        log.info("[reconciler] facts: novo perdeu {} fato(s) ({}) — disparando merge LLM",
                missing.size(), missing);

        String merged = mergeFactsViaLlm(oldFacts, newFacts, missing);
        if (isBlank(merged)) {
            return cap(oldFacts + "\n" + newFacts, FACTS_CAP);
        }

        Set<String> mergedTokens = extractTokens(merged);
        if (!mergedTokens.containsAll(oldTokens)) {
            log.warn("[reconciler] merge LLM ainda perdeu tokens — caindo p/ concat antigo+novo");
            return cap(oldFacts + "\n" + newFacts, FACTS_CAP);
        }
        return cap(merged, FACTS_CAP);
    }

    public String reconcileIntent(String oldIntent, String newIntent) {
        if (isBlank(newIntent)) return oldIntent;
        if (isBlank(oldIntent)) return cap(newIntent, INTENT_CAP);

        int oldLen = oldIntent.length();
        int newLen = newIntent.length();
        if (newLen >= INTENT_SHRINK_THRESHOLD * oldLen) {
            return cap(newIntent, INTENT_CAP);
        }

        log.info("[reconciler] intent: novo encolheu ({} → {} chars, <{}%) — disparando merge LLM",
                oldLen, newLen, (int) (INTENT_SHRINK_THRESHOLD * 100));

        String merged = mergeIntentViaLlm(oldIntent, newIntent);
        if (isBlank(merged)) {
            return cap(oldIntent, INTENT_CAP);
        }
        return cap(merged, INTENT_CAP);
    }

    private String mergeFactsViaLlm(String oldFacts, String newFacts, Set<String> missingTokens) {
        String system = String.join("\n",
                "Você funde dois dossiês de FATOS de um lead. O novo dossiê PERDEU fatos que",
                "estavam no antigo. Sua tarefa: produzir UM único dossiê que preserva TUDO do",
                "antigo + o que há de novo no novo. Não invente. Não opine. Não inclua intenção",
                "ou próximos passos — só fatos objetivos (CNPJ, CPF, IE, CEP, e-mail, telefone,",
                "endereço, empresa, cargo, produtos/SKUs, valores, pedidos, datas).",
                "",
                "Saída: texto corrido em pt-BR, sem cabeçalho, máximo 800 caracteres.",
                "NUNCA omita os tokens listados em MUST_KEEP."
        );
        StringBuilder user = new StringBuilder();
        user.append("MUST_KEEP (fatos do antigo que NÃO podem sumir):\n");
        for (String t : missingTokens) user.append("- ").append(t).append('\n');
        user.append('\n');
        user.append("DOSSIÊ ANTIGO:\n").append(oldFacts).append("\n\n");
        user.append("DOSSIÊ NOVO:\n").append(newFacts).append('\n');
        try {
            return openAiService.generateResponseWithModel("gpt-4o-mini", system, user.toString());
        } catch (Exception e) {
            log.warn("[reconciler] merge LLM falhou: {}", e.getMessage());
            return null;
        }
    }

    private String mergeIntentViaLlm(String oldIntent, String newIntent) {
        String system = String.join("\n",
                "Você funde dois resumos de ESTADO/INTENÇÃO de um lead. O novo encolheu muito;",
                "provavelmente perdeu contexto importante. Funda os dois preservando o que ainda",
                "é verdade do antigo + o estado mais recente do novo. Foque em: interesse,",
                "estágio do funil, objeções, tom, próximo passo. Não inclua dados estruturados",
                "(CNPJ, CEP etc — esses ficam em outro resumo).",
                "",
                "Saída: pt-BR, texto corrido, sem cabeçalho, máximo 500 caracteres."
        );
        StringBuilder user = new StringBuilder();
        user.append("RESUMO ANTERIOR (mais rico):\n").append(oldIntent).append("\n\n");
        user.append("RESUMO NOVO (mais curto):\n").append(newIntent).append('\n');
        try {
            return openAiService.generateResponseWithModel("gpt-4o-mini", system, user.toString());
        } catch (Exception e) {
            log.warn("[reconciler] merge intent LLM falhou: {}", e.getMessage());
            return null;
        }
    }

    static Set<String> extractTokens(String text) {
        Set<String> out = new LinkedHashSet<>();
        if (text == null) return out;
        for (Pattern p : FACT_PATTERNS) {
            Matcher m = p.matcher(text);
            while (m.find()) {
                String tok = normalize(m.group());
                if (!tok.isEmpty()) out.add(tok);
            }
        }
        return out;
    }

    private static String normalize(String s) {
        return s.replaceAll("\\s+", " ").trim().toLowerCase();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String cap(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.length() <= max) return t;
        return t.substring(0, max);
    }
}
