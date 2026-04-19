package com.backend.winai.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Garante um {@link JavaMailSender} quando {@code spring.mail.host} está definido,
 * caso o auto-config do Mail não registe o bean (ex.: ordem de propriedades).
 */
@Configuration
public class MailSenderConfig {

    @Bean
    @ConditionalOnMissingBean(JavaMailSender.class)
    @ConditionalOnProperty(prefix = "spring.mail", name = "host")
    public JavaMailSender javaMailSender(Environment env) {
        String host = env.getProperty("spring.mail.host");
        if (host == null || host.isBlank()) {
            throw new IllegalStateException("spring.mail.host não pode estar vazio");
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host.trim());
        String portStr = env.getProperty("spring.mail.port", "587");
        try {
            sender.setPort(Integer.parseInt(portStr.trim()));
        } catch (NumberFormatException e) {
            sender.setPort(587);
        }
        String user = env.getProperty("spring.mail.username");
        sender.setUsername(user != null && !user.isBlank() ? user : null);
        String pass = env.getProperty("spring.mail.password");
        sender.setPassword(pass != null && !pass.isBlank() ? pass : null);

        Properties p = new Properties();
        p.put("mail.transport.protocol", "smtp");
        p.put("mail.smtp.auth", "true");
        p.put("mail.smtp.starttls.enable",
                env.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "true"));
        p.put("mail.smtp.starttls.required",
                env.getProperty("spring.mail.properties.mail.smtp.starttls.required", "false"));
        sender.setJavaMailProperties(p);
        return sender;
    }
}
