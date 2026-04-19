package com.backend.winai.entity;

public enum ConsultancyRequestStatus {
    PENDING,
    /** Admin informou link (ex.: Google Meet). */
    SCHEDULED,
    DONE,
    CANCELLED
}
