package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.GoogleAdsConnection;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.GoogleAdsConnectionRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleAdsOAuthService {

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    @Value("${google.ads.redirect.uri:}")
    private String redirectUri;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> ADS_SCOPES = List.of("https://www.googleapis.com/auth/adwords");

    private final GoogleAdsConnectionRepository googleAdsConnectionRepository;
    private final CompanyRepository companyRepository;
    private final GoogleAdsService googleAdsService;

    public String getErrorRedirectUrl() {
        return frontendUrl + "/configuracoes?error=google_ads_denied";
    }

    public String getAuthorizationUrl(User user) {
        if (clientId.isEmpty() || clientSecret.isEmpty() || redirectUri.isEmpty()) {
            log.warn(
                    "Google Ads OAuth indisponível: defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_ADS_REDIRECT_URI (ou google.ads.redirect.uri).");
            throw new IllegalStateException(
                    "Não foi possível conectar o Google Ads. Tente mais tarde ou entre em contato com o suporte.");
        }
        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                    httpTransport, JSON_FACTORY, clientId, clientSecret, ADS_SCOPES)
                    .setAccessType("offline")
                    .build();
            String url = flow.newAuthorizationUrl()
                    .setRedirectUri(redirectUri)
                    .setState(user.getCompany().getId().toString())
                    .set("prompt", "consent")
                    .build();
            log.info("Google Ads OAuth: redirect_uri usado na solicitação = {}", redirectUri);
            return url;
        } catch (Exception e) {
            log.error("Google Ads auth URL", e);
            throw new RuntimeException("Falha ao gerar URL Google Ads");
        }
    }

    @Transactional
    public String handleCallback(String code, String companyIdStr) {
        if (code == null || companyIdStr == null) {
            return frontendUrl + "/configuracoes?error=google_ads_denied";
        }
        try {
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    httpTransport, JSON_FACTORY, clientId, clientSecret, code, redirectUri)
                    .execute();

            UUID companyId = UUID.fromString(companyIdStr);
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));

            GoogleAdsConnection conn = googleAdsConnectionRepository.findByCompany_Id(companyId)
                    .orElse(GoogleAdsConnection.builder().company(company).build());
            conn.setCompany(company);
            String rt = tokenResponse.getRefreshToken();
            if (rt != null && !rt.isBlank()) {
                conn.setRefreshToken(rt);
            }
            conn.setConnected(true);
            googleAdsConnectionRepository.save(conn);

            try {
                googleAdsService.tryAutoSelectCustomerAfterOAuth(company);
            } catch (Exception ex) {
                log.warn("Google Ads: não foi possível selecionar conta automaticamente: {}", ex.getMessage());
            }

            return frontendUrl + "/configuracoes?google_ads=connected";
        } catch (Exception e) {
            log.error("Google Ads callback", e);
            return frontendUrl + "/configuracoes?error=google_ads_oauth_failed";
        }
    }

    public Map<String, Object> getStatus(User user) {
        return googleAdsConnectionRepository.findByCompany_Id(user.getCompany().getId())
                .filter(GoogleAdsConnection::isConnected)
                .map(c -> Map.<String, Object>of(
                        "connected", true,
                        "customerId", c.getCustomerId() != null ? c.getCustomerId() : "",
                        "loginCustomerId", c.getLoginCustomerId() != null ? c.getLoginCustomerId() : ""))
                .orElse(Map.of("connected", false));
    }

    @Transactional
    public void disconnect(User user) {
        googleAdsConnectionRepository.findByCompany_Id(user.getCompany().getId()).ifPresent(c -> {
            c.setConnected(false);
            c.setRefreshToken(null);
            googleAdsConnectionRepository.save(c);
        });
    }

    @Transactional
    public void updateCustomerIds(User user, String customerId, String loginCustomerId) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        GoogleAdsConnection conn = googleAdsConnectionRepository.findByCompany_Id(company.getId())
                .orElse(GoogleAdsConnection.builder().company(company).build());
        conn.setCompany(company);
        if (customerId != null) {
            conn.setCustomerId(customerId.replace("-", "").trim());
        }
        if (loginCustomerId != null) {
            conn.setLoginCustomerId(loginCustomerId.replace("-", "").trim());
        }
        googleAdsConnectionRepository.save(conn);
    }
}
