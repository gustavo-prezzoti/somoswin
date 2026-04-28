package com.backend.winai.repository;

import java.util.UUID;

/** Para selects enxutos (picker de carteira cliente ↔ equipe). */
public interface CompanyIdNameProjection {
    UUID getId();

    String getName();
}
