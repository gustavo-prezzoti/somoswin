package com.backend.winai.event;

import java.util.UUID;

/**
 * Evento disparado quando uma empresa conecta a Meta com sucesso.
 * Usado para sincronizar dados após o commit da transação.
 */
public record MetaConnectedEvent(UUID companyId) {
}
