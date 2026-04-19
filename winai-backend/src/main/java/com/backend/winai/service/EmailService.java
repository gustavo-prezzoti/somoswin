package com.backend.winai.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Environment env;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    /**
     * Remetente: {@code app.mail.from} / {@code MAIL_FROM}, ou {@code spring.mail.username} se vazio
     * (SMTPs como Hostinger rejeitam From diferente da caixa autenticada).
     */
    private String resolveFromAddress() {
        String explicit = env.getProperty("app.mail.from");
        if (explicit != null && !explicit.isBlank()) {
            return explicit.trim();
        }
        String user = env.getProperty("spring.mail.username");
        if (user != null && !user.isBlank()) {
            return user.trim();
        }
        throw new IllegalStateException(
                "Defina MAIL_FROM ou use o mesmo e-mail em MAIL_USERNAME (remetente SMTP).");
    }

    public void sendAccessInvitation(String toEmail, String companyName, String inviteToken) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException(
                    "Envio de e-mail não está configurado. Defina spring.mail.host (e credenciais) no servidor.");
        }

        String link = frontendBaseUrl.replaceAll("/$", "") + "/aceitar-convite?token=" + inviteToken;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Convite para acessar " + companyName + " — SomosWin");
            helper.setText(buildInvitationHtml(companyName, link), true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail de convite para {}", toEmail, e);
            throw new RuntimeException("Não foi possível enviar o e-mail de convite. Verifique o SMTP.", e);
        }
    }

    private String buildInvitationHtml(String companyName, String link) {
        return """
                <html><body style="font-family: sans-serif;">
                <p>Olá,</p>
                <p>Você foi convidado(a) para acessar a operação <strong>%s</strong> na plataforma SomosWin.</p>
                <p><a href="%s" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Aceitar convite e criar senha</a></p>
                <p style="color:#666;font-size:12px;">Se o botão não funcionar, copie e cole este link no navegador:<br/>%s</p>
                </body></html>
                """.formatted(companyName, link, link);
    }
}
