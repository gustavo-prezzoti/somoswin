package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PutStaffCompanyAssignmentsRequest {

    /** Substitui a carteira inteira; null ou lista vazia remove todas as associações. */
    private List<UUID> companyIds;
}
