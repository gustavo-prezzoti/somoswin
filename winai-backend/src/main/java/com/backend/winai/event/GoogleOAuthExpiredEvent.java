package com.backend.winai.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Evento disparado quando o token OAuth do Google expira e a conexão é desconectada.
 * Usado para enviar notificações aos usuários da empresa.
 */
@Getter
public class GoogleOAuthExpiredEvent extends ApplicationEvent {

    private final UUID companyId;

    public GoogleOAuthExpiredEvent(Object source, UUID companyId) {
        super(source);
        this.companyId = companyId;
    }
}
