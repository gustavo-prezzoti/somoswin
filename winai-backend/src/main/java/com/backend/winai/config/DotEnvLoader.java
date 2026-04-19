package com.backend.winai.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;


public final class DotEnvLoader {

    private static final Logger log = LoggerFactory.getLogger(DotEnvLoader.class);

    private DotEnvLoader() {
    }

    public static void load() {
        Path dir = Path.of("").toAbsolutePath();
        for (int depth = 0; depth < 8; depth++) {
            Path envFile = dir.resolve(".env");
            if (Files.isRegularFile(envFile)) {
                Dotenv dotenv = Dotenv.configure()
                        .directory(dir.toString())
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
                log.info("Carregado .env a partir de {} ({} variáveis aplicadas ao sistema)", envFile.toAbsolutePath(), n);
                return;
            }
            Path parent = dir.getParent();
            if (parent == null) {
                break;
            }
            dir = parent;
        }
        log.debug("Nenhum ficheiro .env encontrado ao subir diretórios a partir do cwd; use variáveis de ambiente ou -DMAIL_HOST=...");
    }
}
