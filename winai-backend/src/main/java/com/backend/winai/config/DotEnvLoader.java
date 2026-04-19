package com.backend.winai.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Carrega {@code .env} antes do Spring e copia {@code MAIL_*} para {@code spring.mail.*},
 * para o {@link org.springframework.mail.javamail.JavaMailSender} ser criado de forma fiável.
 */
public final class DotEnvLoader {

    private static final Logger log = LoggerFactory.getLogger(DotEnvLoader.class);

    private DotEnvLoader() {
    }

    public static void load() {
        Set<Path> tried = new LinkedHashSet<>();
        Path cwd = Path.of("").toAbsolutePath();

        // 1) cwd/.env
        // 2) cwd/somoswin/.env (repo aberto em somoswin_v2: o .env fica em somoswin/.env)
        // 3) sobe diretórios: …/winai-backend → …/somoswin/.env
        if (tryLoadEnvFile(cwd.resolve(".env"), tried)) {
            syncSpringMailFromMailKeys();
            return;
        }
        if (tryLoadEnvFile(cwd.resolve("somoswin").resolve(".env"), tried)) {
            syncSpringMailFromMailKeys();
            return;
        }

        Path dir = cwd;
        for (int depth = 0; depth < 10; depth++) {
            if (tryLoadEnvFile(dir.resolve(".env"), tried)) {
                syncSpringMailFromMailKeys();
                return;
            }
            Path parent = dir.getParent();
            if (parent == null) {
                break;
            }
            dir = parent;
        }

        log.warn(
                "Nenhum .env carregado (tentativas: {}). cwd={}. Defina MAIL_HOST no ambiente ou -DMAIL_HOST=...",
                tried.size(),
                cwd);
        syncSpringMailFromMailKeys();
    }

    private static boolean tryLoadEnvFile(Path envFile, Set<Path> tried) {
        tried.add(envFile.toAbsolutePath());
        if (!Files.isRegularFile(envFile)) {
            return false;
        }
        Dotenv dotenv = Dotenv.configure()
                .directory(envFile.getParent().toString())
                .ignoreIfMissing()
                .load();
        int n = 0;
        for (var entry : dotenv.entries()) {
            String key = entry.getKey();
            String val = entry.getValue();
            if (val == null) {
                continue;
            }
            val = val.trim();
            if (val.isEmpty()) {
                continue;
            }
            if (System.getenv(key) != null) {
                continue;
            }
            if (System.getProperty(key) != null) {
                continue;
            }
            System.setProperty(key, val);
            n++;
        }
        log.info("Carregado .env: {} ({} entradas)", envFile.toAbsolutePath(), n);
        return true;
    }

    /**
     * Garante que {@code spring.mail.*} existe quando {@code MAIL_*} veio do .env ou do SO
     * (o MailSenderAutoConfiguration usa {@code spring.mail.host} diretamente).
     */
    static void syncSpringMailFromMailKeys() {
        copyToSpringMail("MAIL_HOST", "spring.mail.host");
        copyToSpringMail("MAIL_PORT", "spring.mail.port");
        copyToSpringMail("MAIL_USERNAME", "spring.mail.username");
        copyToSpringMail("MAIL_PASSWORD", "spring.mail.password");

        String host = System.getProperty("spring.mail.host");
        if (host == null || host.isBlank()) {
            host = firstNonBlank(
                    System.getenv("SPRING_MAIL_HOST"),
                    System.getenv("MAIL_HOST"),
                    System.getProperty("MAIL_HOST"));
            if (host != null && !host.isBlank()) {
                System.setProperty("spring.mail.host", host.trim());
            }
        }

        if (log.isDebugEnabled()) {
            String h = System.getProperty("spring.mail.host");
            log.debug("spring.mail.host após sync: {}", h != null && !h.isBlank() ? "[definido]" : "[vazio]");
        }
    }

    private static void copyToSpringMail(String mailKey, String springKey) {
        if (System.getProperty(springKey) != null && !System.getProperty(springKey).isBlank()) {
            return;
        }
        String v = firstNonBlank(System.getenv(mailKey), System.getProperty(mailKey));
        if (v != null && !v.isBlank()) {
            System.setProperty(springKey, v.trim());
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) {
                return v.trim();
            }
        }
        return null;
    }
}
