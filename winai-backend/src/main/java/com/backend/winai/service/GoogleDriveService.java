package com.backend.winai.service;

import com.backend.winai.dto.googledrive.DriveConnectionStatusDTO;
import com.backend.winai.dto.googledrive.DriveFileDTO;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.GoogleDriveConnection;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.User;
import com.backend.winai.repository.GoogleDriveConnectionRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.EventAttendee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Date;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleDriveService {

    private final GoogleDriveConnectionRepository driveConnectionRepository;
    private final com.backend.winai.repository.MeetingRepository meetingRepository;

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    @Value("${google.redirect.uri:https://server.somoswin.com.br/api/v1/drive/callback}")
    private String redirectUri;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private static final String APPLICATION_NAME = "Win AI";
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = java.util.Arrays.asList(
            DriveScopes.DRIVE_READONLY,
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events");

    /**
     * Generate OAuth URL for user to authorize Google Drive access
     */
    public String getAuthorizationUrl(User user) {
        if (clientId.isEmpty() || clientSecret.isEmpty()) {
            throw new RuntimeException("Google Drive credentials not configured");
        }

        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                    httpTransport, JSON_FACTORY, clientId, clientSecret, SCOPES)
                    .setAccessType("offline")
                    .build();

            return flow.newAuthorizationUrl()
                    .setRedirectUri(redirectUri)
                    .setState(user.getCompany().getId().toString())
                    .build();
        } catch (GeneralSecurityException | IOException e) {
            log.error("Error generating authorization URL", e);
            throw new RuntimeException("Failed to generate authorization URL");
        }
    }

    /**
     * Handle OAuth callback and save tokens
     */
    @Transactional
    public String handleCallback(String code, String companyId) {
        if (clientId.isEmpty() || clientSecret.isEmpty()) {
            return frontendUrl + "/configuracoes?error=credentials_not_configured";
        }

        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    httpTransport, JSON_FACTORY, clientId, clientSecret, code, redirectUri)
                    .execute();

            // Get user email from token
            String email = getUserEmail(tokenResponse.getAccessToken());

            // Find or create connection
            GoogleDriveConnection connection = driveConnectionRepository
                    .findByCompanyId(java.util.UUID.fromString(companyId))
                    .orElse(new GoogleDriveConnection());

            connection.setCompany(Company.builder().id(java.util.UUID.fromString(companyId)).build());
            connection.setAccessToken(tokenResponse.getAccessToken());
            connection.setRefreshToken(tokenResponse.getRefreshToken());
            connection.setTokenExpiresAt(ZonedDateTime.now().plusSeconds(tokenResponse.getExpiresInSeconds()));
            connection.setEmail(email);
            connection.setConnected(true);

            driveConnectionRepository.save(connection);

            log.info("Google Drive connected successfully for company: {}", companyId);

            // Trigger initial sync
            try {
                performFullSync(connection.getCompany());
            } catch (Exception e) {
                log.error("Initial sync failed", e);
            }

            return frontendUrl + "/configuracoes?google=connected";

        } catch (Exception e) {
            log.error("Error handling OAuth callback", e);
            return frontendUrl + "/configuracoes?error=oauth_failed";
        }
    }

    /**
     * Get connection status for a company
     */
    public DriveConnectionStatusDTO getConnectionStatus(User user) {
        return driveConnectionRepository.findByCompany(user.getCompany())
                .filter(GoogleDriveConnection::isConnected)
                .map(conn -> DriveConnectionStatusDTO.builder()
                        .connected(true)
                        .email(conn.getEmail())
                        .message("Conectado ao Google Drive")
                        .build())
                .orElse(DriveConnectionStatusDTO.builder()
                        .connected(false)
                        .message("Não conectado")
                        .build());
    }

    /**
     * List files from a folder
     */
    public List<DriveFileDTO> listFiles(User user, String folderId) {
        GoogleDriveConnection connection = driveConnectionRepository.findByCompany(user.getCompany())
                .orElseThrow(() -> new RuntimeException("Google Drive não conectado"));

        if (!connection.isConnected()) {
            throw new RuntimeException("Google Drive não conectado");
        }

        try {
            Drive driveService = getDriveService(connection);

            String query = folderId == null || folderId.equals("root")
                    ? "'root' in parents and trashed = false"
                    : "'" + folderId + "' in parents and trashed = false";

            FileList result = driveService.files().list()
                    .setQ(query)
                    .setPageSize(50)
                    .setFields("files(id, name, mimeType, iconLink, thumbnailLink, webViewLink, size)")
                    .setOrderBy("folder,name")
                    .execute();

            List<DriveFileDTO> files = new ArrayList<>();
            for (File file : result.getFiles()) {
                files.add(DriveFileDTO.builder()
                        .id(file.getId())
                        .name(file.getName())
                        .mimeType(file.getMimeType())
                        .iconLink(file.getIconLink())
                        .thumbnailLink(file.getThumbnailLink())
                        .webViewLink(file.getWebViewLink())
                        .size(file.getSize())
                        .isFolder("application/vnd.google-apps.folder".equals(file.getMimeType()))
                        .build());
            }

            return files;

        } catch (Exception e) {
            log.error("Error listing Drive files", e);
            throw new RuntimeException("Erro ao listar arquivos do Drive: " + e.getMessage());
        }
    }

    /**
     * Disconnect Google Drive
     */
    @Transactional
    public void disconnect(User user) {
        driveConnectionRepository.findByCompany(user.getCompany())
                .ifPresent(connection -> {
                    connection.setConnected(false);
                    connection.setAccessToken(null);
                    connection.setRefreshToken(null);
                    driveConnectionRepository.save(connection);
                });
    }

    /**
     * Get Drive service with credentials
     */
    private Drive getDriveService(GoogleDriveConnection connection) throws GeneralSecurityException, IOException {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        AccessToken accessToken = new AccessToken(
                connection.getAccessToken(),
                Date.from(connection.getTokenExpiresAt().toInstant()));

        GoogleCredentials credentials = GoogleCredentials.create(accessToken);

        return new Drive.Builder(httpTransport, JSON_FACTORY, new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * Get user email from access token (simplified)
     */
    private String getUserEmail(String accessToken) {
        // In a full implementation, you would call the Google UserInfo API
        // For now, we'll return a placeholder
        return "usuario@gmail.com";
    }

    /**
     * Create a calendar event
     */
    /**
     * Create a calendar event
     */
    public String createCalendarEvent(Company company, Meeting meeting) {
        try {
            GoogleDriveConnection connection = driveConnectionRepository.findByCompany(company)
                    .orElseThrow(() -> new RuntimeException("Google Drive/Calendar não conectado"));

            if (!connection.isConnected())
                return null;

            Calendar service = getCalendarService(connection);

            Event event = new Event()
                    .setSummary(meeting.getTitle())
                    .setDescription(meeting.getNotes());

            LocalDateTime startDateTime = LocalDateTime.of(meeting.getMeetingDate(), meeting.getMeetingTime());
            LocalDateTime endDateTime = startDateTime.plusMinutes(meeting.getDurationMinutes());

            ZoneId zoneId = ZoneId.of("America/Sao_Paulo"); // Melhor usar timezone fixo ou do usuario

            EventDateTime start = new EventDateTime()
                    .setDateTime(new DateTime(java.util.Date.from(startDateTime.atZone(zoneId).toInstant())))
                    .setTimeZone("America/Sao_Paulo");
            event.setStart(start);

            EventDateTime end = new EventDateTime()
                    .setDateTime(new DateTime(java.util.Date.from(endDateTime.atZone(zoneId).toInstant())))
                    .setTimeZone("America/Sao_Paulo");
            event.setEnd(end);

            if (meeting.getContactEmail() != null && !meeting.getContactEmail().isEmpty()) {
                EventAttendee[] attendees = new EventAttendee[] {
                        new EventAttendee().setEmail(meeting.getContactEmail())
                };
                event.setAttendees(java.util.Arrays.asList(attendees));
            }

            Event createdEvent = service.events().insert("primary", event).execute();
            return createdEvent.getId();

        } catch (Exception e) {
            log.error("Error creating calendar event", e);
            return null;
        }
    }

    /**
     * Update a calendar event
     */
    /**
     * Update a calendar event
     */
    public void updateCalendarEvent(Company company, Meeting meeting) {
        if (meeting.getGoogleEventId() == null)
            return;

        try {
            GoogleDriveConnection connection = driveConnectionRepository.findByCompany(company)
                    .orElseThrow(() -> new RuntimeException("Google Drive/Calendar não conectado"));

            if (!connection.isConnected())
                return;

            Calendar service = getCalendarService(connection);

            Event event = service.events().get("primary", meeting.getGoogleEventId()).execute();

            event.setSummary(meeting.getTitle())
                    .setDescription(meeting.getNotes());

            LocalDateTime startDateTime = LocalDateTime.of(meeting.getMeetingDate(), meeting.getMeetingTime());
            LocalDateTime endDateTime = startDateTime.plusMinutes(meeting.getDurationMinutes());
            ZoneId zoneId = ZoneId.of("America/Sao_Paulo");

            EventDateTime start = new EventDateTime()
                    .setDateTime(new DateTime(java.util.Date.from(startDateTime.atZone(zoneId).toInstant())))
                    .setTimeZone("America/Sao_Paulo");
            event.setStart(start);

            EventDateTime end = new EventDateTime()
                    .setDateTime(new DateTime(java.util.Date.from(endDateTime.atZone(zoneId).toInstant())))
                    .setTimeZone("America/Sao_Paulo");
            event.setEnd(end);

            service.events().update("primary", event.getId(), event).execute();
            log.info("Updated calendar event: {}", event.getId());

        } catch (Exception e) {
            log.error("Error updating calendar event", e);
        }
    }

    /**
     * Delete a calendar event
     */
    /**
     * Delete a calendar event
     */
    public void deleteCalendarEvent(Company company, String eventId) {
        if (eventId == null)
            return;
        try {
            GoogleDriveConnection connection = driveConnectionRepository.findByCompany(company)
                    .orElseThrow(() -> new RuntimeException("Google Drive/Calendar não conectado"));

            if (!connection.isConnected())
                return;

            Calendar service = getCalendarService(connection);
            service.events().delete("primary", eventId).execute();
            log.info("Deleted calendar event: {}", eventId);

        } catch (Exception e) {
            log.error("Error deleting calendar event", e);
        }
    }

    private Calendar getCalendarService(GoogleDriveConnection connection) throws GeneralSecurityException, IOException {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        // Verificar se há refresh token antes de tentar criar credentials com refresh
        String refreshToken = connection.getRefreshToken();
        boolean hasRefreshToken = refreshToken != null && !refreshToken.trim().isEmpty();

        // Usar UserCredentials que suporta refresh automático
        com.google.auth.oauth2.UserCredentials.Builder credentialsBuilder = com.google.auth.oauth2.UserCredentials
                .newBuilder()
                .setClientId(clientId)
                .setClientSecret(clientSecret)
                .setAccessToken(new AccessToken(
                        connection.getAccessToken(),
                        Date.from(connection.getTokenExpiresAt().toInstant())));

        // Só adicionar refresh token se existir
        if (hasRefreshToken) {
            credentialsBuilder.setRefreshToken(refreshToken);
        }

        com.google.auth.oauth2.UserCredentials credentials = credentialsBuilder.build();

        // Refresh se expirado e se tiver refresh token
        if (hasRefreshToken && connection.getTokenExpiresAt().isBefore(java.time.ZonedDateTime.now().plusMinutes(5))) {
            try {
                credentials.refresh();
                // Atualizar tokens no banco
                connection.setAccessToken(credentials.getAccessToken().getTokenValue());
                connection.setTokenExpiresAt(java.time.ZonedDateTime.now().plusSeconds(3600));
                driveConnectionRepository.save(connection);
                log.info("Token refreshed successfully");
            } catch (Exception e) {
                log.warn("Failed to refresh token for company {}: {}. Connection may need to be re-authenticated.",
                        connection.getCompany().getId(), e.getMessage());
                // Se não conseguir fazer refresh e o token está expirado, marcar como
                // desconectado
                if (connection.getTokenExpiresAt().isBefore(java.time.ZonedDateTime.now())) {
                    connection.setConnected(false);
                    driveConnectionRepository.save(connection);
                    log.info("Marked connection as disconnected due to expired token without refresh capability");
                }
            }
        } else if (!hasRefreshToken && connection.getTokenExpiresAt().isBefore(java.time.ZonedDateTime.now())) {
            // Token expirado sem refresh token - marcar como desconectado
            log.warn("Token expired for company {} without refresh token. Marking as disconnected.",
                    connection.getCompany().getId());
            connection.setConnected(false);
            driveConnectionRepository.save(connection);
            throw new IllegalStateException("Token expired and no refresh token available. Please re-authenticate.");
        }

        return new Calendar.Builder(httpTransport, JSON_FACTORY, new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * Perform full bidirectional sync (Google -> App authority)
     */
    @Transactional
    public void performFullSync(Company company) {
        try {
            GoogleDriveConnection connection = driveConnectionRepository.findByCompany(company).orElse(null);
            if (connection == null || !connection.isConnected())
                return;

            Calendar service;
            try {
                service = getCalendarService(connection);
            } catch (IllegalStateException e) {
                // Token expirado sem refresh token - não fazer sync
                log.warn("Cannot perform sync for company {}: {}", company.getId(), e.getMessage());
                return;
            } catch (Exception e) {
                log.error("Error getting calendar service for company {}", company.getId(), e);
                return;
            }

            // Range: -30 days to +180 days
            DateTime minTime = new DateTime(System.currentTimeMillis() - 2592000000L);
            DateTime maxTime = new DateTime(System.currentTimeMillis() + 15552000000L);

            List<Event> googleEvents = new ArrayList<>();
            String pageToken = null;
            do {
                com.google.api.services.calendar.model.Events events = service.events().list("primary")
                        .setTimeMin(minTime)
                        .setTimeMax(maxTime)
                        .setPageToken(pageToken)
                        .setSingleEvents(true)
                        .execute();
                List<Event> items = events.getItems();
                if (items != null)
                    googleEvents.addAll(items);
                pageToken = events.getNextPageToken();
            } while (pageToken != null);

            java.time.LocalDate minLoc = LocalDateTime
                    .ofInstant(Instant.ofEpochMilli(minTime.getValue()), ZoneId.of("America/Sao_Paulo")).toLocalDate();
            java.time.LocalDate maxLoc = LocalDateTime
                    .ofInstant(Instant.ofEpochMilli(maxTime.getValue()), ZoneId.of("America/Sao_Paulo")).toLocalDate();

            List<Meeting> localMeetings = meetingRepository.findByCompanyAndDateRange(company, minLoc, maxLoc);
            List<Meeting> toDelete = new ArrayList<>(localMeetings);

            for (Event event : googleEvents) {
                if ("cancelled".equals(event.getStatus()))
                    continue;

                Meeting meeting = toDelete.stream()
                        .filter(m -> event.getId().equals(m.getGoogleEventId()))
                        .findFirst().orElse(null);

                if (meeting != null) {
                    toDelete.remove(meeting);
                } else {
                    meeting = new Meeting();
                    meeting.setCompany(company);
                    meeting.setGoogleEventId(event.getId());
                    meeting.setStatus(com.backend.winai.entity.MeetingStatus.SCHEDULED);
                    meeting.setScheduledBy("Google Calendar");
                }

                meeting.setTitle(event.getSummary() != null ? event.getSummary() : "Sem Título");
                meeting.setNotes(event.getDescription());

                EventDateTime start = event.getStart();
                EventDateTime end = event.getEnd();

                ZoneId zone = ZoneId.of("America/Sao_Paulo");

                if (start != null && start.getDateTime() != null) {
                    Instant instant = Instant.ofEpochMilli(start.getDateTime().getValue());
                    meeting.setMeetingDate(LocalDateTime.ofInstant(instant, zone).toLocalDate());
                    meeting.setMeetingTime(LocalDateTime.ofInstant(instant, zone).toLocalTime());
                } else if (start != null && start.getDate() != null) {
                    meeting.setMeetingDate(java.time.LocalDate.parse(start.getDate().toString()));
                    meeting.setMeetingTime(LocalTime.of(8, 0));
                }

                if (start != null && end != null && start.getDateTime() != null && end.getDateTime() != null) {
                    long diff = end.getDateTime().getValue() - start.getDateTime().getValue();
                    meeting.setDurationMinutes((int) (diff / 60000));
                }

                List<Map<String, String>> attendeesList = new ArrayList<>();
                if (event.getAttendees() != null) {
                    for (EventAttendee a : event.getAttendees()) {
                        if (a.getEmail() == null)
                            continue;
                        Map<String, String> att = new HashMap<>();
                        att.put("email", a.getEmail());
                        att.put("name", a.getDisplayName() != null ? a.getDisplayName() : a.getEmail());
                        att.put("status", a.getResponseStatus());
                        attendeesList.add(att);
                    }
                }

                if (event.getOrganizer() != null && event.getOrganizer().getEmail() != null) {
                    String orgEmail = event.getOrganizer().getEmail();
                    boolean exists = attendeesList.stream().anyMatch(m -> orgEmail.equals(m.get("email")));
                    if (!exists) {
                        Map<String, String> att = new HashMap<>();
                        att.put("email", orgEmail);
                        att.put("name",
                                event.getOrganizer().getDisplayName() != null ? event.getOrganizer().getDisplayName()
                                        : orgEmail);
                        att.put("status", "organizer");
                        attendeesList.add(att);
                    }
                }

                try {
                    meeting.setAttendeesJson(new ObjectMapper().writeValueAsString(attendeesList));
                } catch (Exception e) {
                    log.error("Failed to serialize attendees", e);
                }

                // Priorizar primeiro CONVIDADO (não organizador) como contato principal
                Map<String, String> primaryContact = null;

                // Primeiro: buscar um convidado que NÃO seja o organizador
                for (Map<String, String> att : attendeesList) {
                    if (!"organizer".equals(att.get("status"))) {
                        primaryContact = att;
                        break;
                    }
                }

                // Fallback: se não encontrou convidado, usar o organizador
                if (primaryContact == null && !attendeesList.isEmpty()) {
                    primaryContact = attendeesList.get(0);
                }

                // Definir contato principal
                if (primaryContact != null) {
                    meeting.setContactEmail(primaryContact.get("email"));
                    meeting.setContactName(primaryContact.get("name"));
                } else {
                    meeting.setContactName("Sem Participantes");
                }

                if (meeting.getContactName() == null || meeting.getContactName().isEmpty()) {
                    meeting.setContactName(
                            meeting.getContactEmail() != null ? meeting.getContactEmail() : "Google Event");
                }

                meetingRepository.save(meeting);
            }

            // Remove remaining local meetings that are not in Google (within range/context)
            // User requested strict sync: "caso tenha na aplicação e não no google calendar
            // vai remover"
            meetingRepository.deleteAll(toDelete);

        } catch (Exception e) {
            log.error("Error in sync", e);
        }
    }
}
