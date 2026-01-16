package com.backend.winai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ClinicorpService {

    private final RestTemplate restTemplate = new RestTemplate();
    @Value("${python.backend.url:http://python-backend:5000/api}")
    private String pythonBackendUrl;

    /**
     * Searches for information in the simulated knowledge base.
     * Currently a stub as the Python backend is focused on Agenda/Patient.
     */
    public String searchKnowledgeBase(String query) {
        log.info("Clinicorp Tool: Searching knowledge base for '{}'", query);
        // TODO: Implement actual RAG endpoint in Python if needed
        return "Informação sobre '" + query + "' não encontrada na base de conhecimento.";
    }

    @SuppressWarnings("unchecked")
    public List<String> getAvailableSlots(LocalDate date) {
        return getAvailableSlots(date, 3); // Default to 3 days if called without range
    }

    @SuppressWarnings("unchecked")
    public List<String> getAvailableSlots(LocalDate date, int days) {
        log.info("Clinicorp Tool: Searching slots starting from {} for {} days", date, days);
        try {
            // Using the /agenda/profissionais endpoint with com_agendas=true to get a
            // bigger picture
            String url = pythonBackendUrl + "/agenda/profissionais?com_agendas=true&data=" + date + "&dias_futuros="
                    + days;

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    null,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getBody() != null && response.getBody().containsKey("profissionais")) {
                List<Map<String, Object>> profissionais = (List<Map<String, Object>>) response.getBody()
                        .get("profissionais");
                List<String> allSlots = new ArrayList<>();

                for (Map<String, Object> prof : profissionais) {
                    String profNome = (String) prof.get("nome");
                    List<Map<String, Object>> agendasPorDia = (List<Map<String, Object>>) prof.get("agendas_por_dia");

                    if (agendasPorDia != null) {
                        for (Map<String, Object> dia : agendasPorDia) {
                            String dataStr = (String) dia.get("data");
                            List<Map<String, Object>> slots = (List<Map<String, Object>>) dia.get("agendas");
                            if (slots != null) {
                                for (Map<String, Object> slot : slots) {
                                    allSlots.add(dataStr + " " + slot.get("hora_inicio") + " (" + profNome + ")");
                                }
                            }
                        }
                    }
                }
                return allSlots;
            }
        } catch (Exception e) {
            log.error("Error fetching available slots from Python backend at {}", pythonBackendUrl, e);
        }
        return Collections.emptyList();
    }

    public boolean createPatient(String name, String phone) {
        log.info("Clinicorp Tool: Creating patient - Name: {}, Phone: {}", name, phone);
        try {
            String url = pythonBackendUrl + "/paciente/criar";
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("nome", name);
            requestBody.put("telefone", phone);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return Boolean.TRUE.equals(response.getBody().get("sucesso"))
                        || response.getBody().containsKey("paciente");
            }
        } catch (Exception e) {
            log.error("Error creating patient in Python backend", e);
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    public boolean createAppointment(String patientName, String phone, String date, String time) {
        log.info("Clinicorp Tool: Creating appointment for {} ({}) at {} {}", patientName, phone, date, time);
        try {
            // 1. Need a professional ID. Fetch one first.
            String url = pythonBackendUrl + "/agenda/profissionais";
            ResponseEntity<Map<String, Object>> proResponse = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    null,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });
            String professionalId = null;

            if (proResponse.getBody() != null && proResponse.getBody().containsKey("profissionais")) {
                List<Map<String, Object>> pros = (List<Map<String, Object>>) proResponse.getBody().get("profissionais");
                if (!pros.isEmpty()) {
                    professionalId = String.valueOf(pros.get(0).get("id"));
                }
            }

            if (professionalId == null) {
                log.error("No professional found to create appointment");
                return false;
            }

            // 2. Create Appointment
            url = pythonBackendUrl + "/agenda/criar";
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("profissional_id", professionalId);
            requestBody.put("data", date);
            requestBody.put("hora_inicio", time);
            requestBody.put("telefone", phone);
            requestBody.put("nome_paciente", patientName);

            // Calculate end time (assuming 1 hour duration by default)
            try {
                String[] timeParts = time.split(":");
                int hour = Integer.parseInt(timeParts[0]);
                int minute = Integer.parseInt(timeParts[1]);
                String endTime = String.format("%02d:%02d", hour + 1, minute);
                requestBody.put("hora_fim", endTime);
            } catch (Exception e) {
                requestBody.put("hora_fim", time); // Fallback
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            return response.getStatusCode().is2xxSuccessful() &&
                    (Boolean.TRUE.equals(response.getBody().get("sucesso")) || response.getBody().containsKey("id"));

        } catch (Exception e) {
            log.error("Error creating appointment in Python backend", e);
        }
        return false;
    }

    public List<Map<String, Object>> getAppointmentsByPhone(String phone) {
        log.info("Clinicorp Tool: Searching appointments for phone {}", phone);
        try {
            String url = pythonBackendUrl + "/paciente/agendamentos?telefone=" + phone;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    null,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getBody() != null && response.getBody().containsKey("agendamentos")) {
                return (List<Map<String, Object>>) response.getBody().get("agendamentos");
            }
        } catch (Exception e) {
            log.error("Error fetching patient appointments", e);
        }
        return Collections.emptyList();
    }

    public boolean confirmAppointment(String appointmentId) {
        log.info("Clinicorp Tool: Confirming appointment ID {}", appointmentId);
        try {
            String url = pythonBackendUrl + "/agenda/confirmar";
            Map<String, String> body = Map.of("id", appointmentId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });
            return response.getStatusCode().is2xxSuccessful() && Boolean.TRUE.equals(response.getBody().get("sucesso"));
        } catch (Exception e) {
            log.error("Error confirming appointment", e);
            return false;
        }
    }

    public boolean cancelAppointmentLocal(String appointmentId) {
        log.info("Clinicorp Tool: Canceling local appointment ID {}", appointmentId);
        try {
            String url = pythonBackendUrl + "/agenda/cancelar-local";
            Map<String, String> body = Map.of("id", appointmentId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });
            return response.getStatusCode().is2xxSuccessful() && Boolean.TRUE.equals(response.getBody().get("sucesso"));
        } catch (Exception e) {
            log.error("Error canceling appointment", e);
            return false;
        }
    }

    public boolean savePatientName(String name, String phone) {
        log.info("Clinicorp Tool: Saving patient name {} for phone {}", name, phone);
        try {
            String url = pythonBackendUrl + "/paciente/salvar-nome";
            Map<String, String> body = Map.of("nome", name, "telefone", phone);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    request,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });
            return response.getStatusCode().is2xxSuccessful() && Boolean.TRUE.equals(response.getBody().get("sucesso"));
        } catch (Exception e) {
            log.error("Error saving patient name", e);
            return false;
        }
    }
}
