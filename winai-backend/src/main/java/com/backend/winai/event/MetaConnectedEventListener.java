package com.backend.winai.event;

import com.backend.winai.service.MetaSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Dispara o sync da Meta após o commit da conexão.
 * Garante que os dados sejam sincronizados imediatamente ao conectar.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MetaConnectedEventListener {

    private final MetaSyncService metaSyncService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMetaConnected(MetaConnectedEvent event) {
        log.info("[MetaSync] Conexão Meta confirmada - sincronizando empresa {} (após commit)", event.companyId());
        metaSyncService.syncForCompany(event.companyId());
    }
}
