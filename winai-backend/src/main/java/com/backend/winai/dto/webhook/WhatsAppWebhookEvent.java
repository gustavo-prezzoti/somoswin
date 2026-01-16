package com.backend.winai.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WhatsAppWebhookEvent {
    private String event;
    private String instance;
    private Map<String, Object> data;
    private String destination;
    private String dateTime;
    private String sender;
    private String serverUrl;
    private String apikey;
}
