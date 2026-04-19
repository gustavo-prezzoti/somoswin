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
import org.springframework.web.util.HtmlUtils;

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

    /**
     * Template HTML alinhado à paleta do app (verde floresta + esmeralda, fundo slate claro).
     * Layout em tabelas + estilos inline para compatibilidade com clientes de e-mail.
     */
    private String buildInvitationHtml(String companyName, String link) {
        String nameEsc = HtmlUtils.htmlEscape(companyName);
        String linkEsc = HtmlUtils.htmlEscape(link);
        return INVITE_EMAIL_TEMPLATE.formatted(nameEsc, nameEsc, linkEsc, linkEsc);
    }

    private static final String INVITE_EMAIL_TEMPLATE = """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Convite SomosWin</title>
            <!--[if mso]>
            <style type="text/css">
              table { border-collapse: collapse; }
              .btn-a { padding: 14px 28px !important; }
            </style>
            <![endif]-->
            </head>
            <body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
              Convite para acessar %s na plataforma SomosWin — crie sua senha.
            </div>
            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
              <tr>
                <td align="center" style="padding:40px 16px;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
                    <tr>
                      <td bgcolor="#003d2b" style="background:linear-gradient(135deg,#003d2b 0%%,#064e3b 55%%,#047857 100%%);border-radius:12px 12px 0 0;padding:28px 32px 24px 32px;">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td>
                              <p style="margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6ee7b7;opacity:0.95;">SomosWin</p>
                              <p style="margin:8px 0 0 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:700;line-height:1.25;color:#ffffff;">Convite para sua equipe</p>
                            </td>
                            <td width="56" align="right" valign="top" style="display:none;mso-hide:all;"></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="height:4px;background:linear-gradient(90deg,#10b981 0%%,#059669 50%%,#047857 100%%);border-radius:0;"></td>
                    </tr>
                    <tr>
                      <td style="background-color:#ffffff;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;border-top:none;">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="padding:36px 32px 28px 32px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
                              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#0f172a;">Olá,</p>
                              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.65;color:#334155;">
                                Você foi convidado(a) para acessar a operação
                                <strong style="color:#0f172a;">%s</strong>
                                na plataforma <strong style="color:#059669;">SomosWin</strong>.
                              </p>
                              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#64748b;">
                                Use o botão abaixo para aceitar o convite e definir sua senha de acesso.
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 32px auto;">
                                <tr>
                                  <td align="center" style="border-radius:10px;background-color:#059669;box-shadow:0 4px 14px rgba(5,150,105,0.35);">
                                    <a class="btn-a" href="%s" target="_blank" rel="noopener noreferrer"
                                       style="display:inline-block;padding:14px 32px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                                      Aceitar convite e criar senha
                                    </a>
                                  </td>
                                </tr>
                              </table>
                              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #f1f5f9;">
                                <tr>
                                  <td style="padding-top:24px;">
                                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#94a3b8;">Link alternativo</p>
                                    <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;word-break:break-all;">
                                      Se o botão não funcionar, copie e cole no navegador:<br/>
                                      <span style="color:#059669;font-weight:600;">%s</span>
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px 8px 0 8px;text-align:center;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
                        <p style="margin:0 0 8px 0;">Este e-mail foi enviado automaticamente pela SomosWin.</p>
                        <p style="margin:0;">Se você não reconhece este convite, pode ignorar esta mensagem.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            </body>
            </html>
            """;
}
