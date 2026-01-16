package com.backend.winai.dto.request;

import lombok.Data;
import java.util.UUID;

@Data
public class LinkConnectionRequest {
    private UUID connectionId;
}
