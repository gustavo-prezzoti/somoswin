package com.backend.winai.service;

import com.backend.winai.dto.request.*;
import com.backend.winai.dto.mapper.UserAuthDtoMapper;
import com.backend.winai.dto.response.AuthResponse;
import com.backend.winai.dto.response.InvitationPreviewResponse;
import com.backend.winai.dto.response.MessageResponse;
import com.backend.winai.dto.response.SessionStatusResponse;
import com.backend.winai.entity.*;
import com.backend.winai.repository.AccessInvitationRepository;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.RefreshTokenRepository;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final AccessInvitationRepository accessInvitationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TermsOfServiceService termsOfServiceService;

    public static final String NEXT_ACTION_MUST_CHANGE_PASSWORD = "MUST_CHANGE_PASSWORD";
    public static final String NEXT_ACTION_NEEDS_CONTRACT_INFO = "NEEDS_CONTRACT_INFO";
    public static final String NEXT_ACTION_SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED";
    /** Membro convidado: assinatura inativa — não acessa o app (só o dono regulariza). */
    public static final String NEXT_ACTION_SUBSCRIPTION_INACTIVE_MEMBER = "SUBSCRIPTION_INACTIVE_MEMBER";
    public static final String NEXT_ACTION_MUST_ACCEPT_TERMS = "MUST_ACCEPT_TERMS";
    public static final String NEXT_ACTION_SUCCESS = "SUCCESS";

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Verifica se e-mail já existe
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("E-mail já cadastrado");
        }

        // Cria a empresa
        Company company = Company.builder()
                .name(request.getCompanyName())
                .segment(request.getSegment())
                .whatsapp(request.getWhatsapp())
                .leadVolume(request.getLeadVolume())
                .plan(UserPlan.STARTER)
                .status(AccountStatus.ACTIVE)
                .build();

        company = companyRepository.save(company);

        // Cria o usuário
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(extractNameFromEmail(request.getEmail()))
                .role(UserRole.ADMIN)
                .company(company)
                .isActive(true)
                .emailVerified(false)
                .build();

        user = userRepository.save(user);

        AuthResponse res = generateAuthResponse(user);
        res.setNextAction(computeNextAction(user));
        return res;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()));
        } catch (BadCredentialsException e) {
            throw new RuntimeException("E-mail ou senha inválidos");
        }

        User user = userRepository.findByEmailWithCompany(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        assertMemberMayAccessAfterAuth(user);

        // Atualiza último login
        user.setLastLogin(ZonedDateTime.now());
        userRepository.save(user);

        AuthResponse res = generateAuthResponse(user);
        res.setNextAction(computeNextAction(user));
        return res;
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new RuntimeException("Refresh token inválido"));

        if (refreshToken.isExpired()) {
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("Refresh token expirado");
        }

        User user = refreshToken.getUser();
        user = userRepository.findByIdWithCompany(user.getId())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        assertMemberMayAccessAfterAuth(user);

        // Deleta o token antigo
        refreshTokenRepository.delete(refreshToken);

        AuthResponse res = generateAuthResponse(user);
        res.setNextAction(computeNextAction(user));
        return res;
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        // Sempre retorna sucesso para não expor se o email existe
        if (user == null) {
            return MessageResponse.success("Se o e-mail existir, você receberá instruções para redefinir sua senha");
        }

        // Gera token de reset
        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetExpires(ZonedDateTime.now().plusHours(1));
        userRepository.save(user);

        // TODO: Enviar e-mail com o link de reset
        // emailService.sendPasswordResetEmail(user.getEmail(), resetToken);

        return MessageResponse.success("Se o e-mail existir, você receberá instruções para redefinir sua senha");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Token inválido ou expirado"));

        if (user.getPasswordResetExpires() == null || ZonedDateTime.now().isAfter(user.getPasswordResetExpires())) {
            throw new RuntimeException("Token expirado");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);
        userRepository.save(user);

        // Invalida todos os refresh tokens do usuário
        refreshTokenRepository.deleteByUser(user);

        return MessageResponse.success("Senha alterada com sucesso");
    }

    @Transactional
    public MessageResponse changePassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        return MessageResponse.success("Senha alterada com sucesso");
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken)
                .ifPresent(refreshTokenRepository::delete);
    }

    /**
     * Retorna a próxima ação obrigatória do usuário (para validar sessão no frontend).
     */
    public SessionStatusResponse getSessionStatus(String userEmail) {
        User user = userRepository.findByEmailWithCompany(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return SessionStatusResponse.builder()
                .nextAction(computeNextAction(user))
                .build();
    }

    @Transactional(readOnly = true)
    public InvitationPreviewResponse getInvitationPreview(String token) {
        AccessInvitation inv = accessInvitationRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Convite inválido"));
        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Este convite não está mais disponível");
        }
        if (ZonedDateTime.now().isAfter(inv.getExpiresAt())) {
            throw new RuntimeException("Convite expirado");
        }
        return InvitationPreviewResponse.builder()
                .email(inv.getEmail())
                .companyName(inv.getCompany().getName())
                .invitedName(inv.getInvitedName())
                .build();
    }

    @Transactional
    public AuthResponse acceptInvitation(AcceptInvitationRequest request) {
        AccessInvitation inv = accessInvitationRepository.findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Convite inválido"));
        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Este convite não está mais disponível");
        }
        if (ZonedDateTime.now().isAfter(inv.getExpiresAt())) {
            inv.setStatus(InvitationStatus.EXPIRED);
            accessInvitationRepository.save(inv);
            throw new RuntimeException("Convite expirado");
        }
        if (userRepository.existsByEmail(inv.getEmail())) {
            throw new RuntimeException("Já existe uma conta com este e-mail");
        }

        String name;
        if (request.getName() != null && !request.getName().isBlank()) {
            name = request.getName().trim();
        } else if (inv.getInvitedName() != null && !inv.getInvitedName().isBlank()) {
            name = inv.getInvitedName().trim();
        } else {
            name = extractNameFromEmail(inv.getEmail());
        }

        User user = User.builder()
                .email(inv.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(name)
                .role(inv.getRole())
                .company(inv.getCompany())
                .jobTitle(inv.getJobTitle())
                .isActive(true)
                .emailVerified(true)
                .mustChangePassword(false)
                .build();

        user = userRepository.save(user);
        inv.setStatus(InvitationStatus.ACCEPTED);
        accessInvitationRepository.save(inv);

        User reloaded = userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Erro ao carregar usuário"));
        assertMemberMayAccessAfterAuth(reloaded);
        AuthResponse res = generateAuthResponse(reloaded);
        res.setNextAction(computeNextAction(reloaded));
        return res;
    }

    private AuthResponse generateAuthResponse(User user) {
        User full = userRepository.findByEmailWithCompany(user.getEmail()).orElse(user);

        Map<String, Object> extraClaims = new HashMap<>();
        if (Boolean.TRUE.equals(full.getAmpliaInternalStaff()) && full.getAmpliaStaffRole() != null) {
            extraClaims.put(
                    "staffPerms",
                    AdminSecurityService.effectivePermissionKeys(full.getAmpliaStaffRole()));
        }

        String accessToken = jwtService.generateToken(extraClaims, full);
        String refreshToken = jwtService.generateRefreshToken(full);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(full)
                .token(refreshToken)
                .expiresAt(ZonedDateTime.now().plusSeconds(jwtService.getRefreshExpiration() / 1000))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getJwtExpiration() / 1000)
                .user(UserAuthDtoMapper.toDto(full))
                .build();
    }

    /**
     * Define a próxima ação obrigatória do usuário (fonte única de verdade no backend).
     * Ordem de prioridade: trocar senha > dados contrato > assinatura expirada > aceitar termos > sucesso.
     */
    private String computeNextAction(User user) {
        if (Boolean.TRUE.equals(user.getMustChangePassword())) {
            return NEXT_ACTION_MUST_CHANGE_PASSWORD;
        }
        Map<String, Object> status = termsOfServiceService.getAcceptanceStatus(user.getId());
        if (Boolean.TRUE.equals(status.get("needsContractInfo"))) {
            return NEXT_ACTION_NEEDS_CONTRACT_INFO;
        }
        if (Boolean.TRUE.equals(status.get("subscriptionExpired"))) {
            if (!Boolean.TRUE.equals(status.get("isBillingOwner"))) {
                return NEXT_ACTION_SUBSCRIPTION_INACTIVE_MEMBER;
            }
            return NEXT_ACTION_SUBSCRIPTION_EXPIRED;
        }
        if (Boolean.FALSE.equals(status.get("hasAccepted"))) {
            return NEXT_ACTION_MUST_ACCEPT_TERMS;
        }
        return NEXT_ACTION_SUCCESS;
    }

    /**
     * Membros que não são o responsável financeiro não podem usar o app enquanto a assinatura
     * da empresa estiver inativa (dono deve regularizar no login dele).
     */
    private void assertMemberMayAccessAfterAuth(User user) {
        if (user.getRole() != null && user.getRole().name().equals("SUPER_ADMIN")) {
            return;
        }
        if (Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            return;
        }
        Map<String, Object> st = termsOfServiceService.getAcceptanceStatus(user.getId());
        if (Boolean.TRUE.equals(st.get("subscriptionExpired")) && !Boolean.TRUE.equals(st.get("isBillingOwner"))) {
            throw new RuntimeException(
                    "Assinatura inativa. Somente o responsável pela conta pode acessar para regularizar o pagamento. "
                            + "Entre em contato com quem administra a empresa.");
        }
    }

    private String extractNameFromEmail(String email) {
        String rawName = email.split("@")[0];
        return rawName.substring(0, 1).toUpperCase() + rawName.substring(1).toLowerCase();
    }
}
