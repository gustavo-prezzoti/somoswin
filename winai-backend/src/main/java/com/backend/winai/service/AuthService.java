package com.backend.winai.service;

import com.backend.winai.dto.request.*;
import com.backend.winai.dto.response.AuthResponse;
import com.backend.winai.dto.response.MessageResponse;
import com.backend.winai.entity.*;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

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

        return generateAuthResponse(user);
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

        // Atualiza último login
        user.setLastLogin(ZonedDateTime.now());
        userRepository.save(user);

        return generateAuthResponse(user);
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

        // Deleta o token antigo
        refreshTokenRepository.delete(refreshToken);

        return generateAuthResponse(user);
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
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken)
                .ifPresent(refreshTokenRepository::delete);
    }

    private AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        // Salva o refresh token no banco
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiresAt(ZonedDateTime.now().plusSeconds(jwtService.getRefreshExpiration() / 1000))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        AuthResponse.CompanyDTO companyDTO = null;
        if (user.getCompany() != null) {
            companyDTO = AuthResponse.CompanyDTO.builder()
                    .id(user.getCompany().getId())
                    .name(user.getCompany().getName())
                    .segment(user.getCompany().getSegment())
                    .plan(user.getCompany().getPlan())
                    .build();
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getJwtExpiration() / 1000)
                .user(AuthResponse.UserDTO.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getName())
                        .role(user.getRole().name())
                        .plan(user.getCompany() != null ? user.getCompany().getPlan().name() : "STARTER")
                        .company(companyDTO)
                        .build())
                .build();
    }

    private String extractNameFromEmail(String email) {
        String rawName = email.split("@")[0];
        return rawName.substring(0, 1).toUpperCase() + rawName.substring(1).toLowerCase();
    }
}
