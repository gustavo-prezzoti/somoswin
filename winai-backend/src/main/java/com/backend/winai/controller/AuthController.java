package com.backend.winai.controller;

import com.backend.winai.dto.request.*;
import com.backend.winai.dto.response.AuthResponse;
import com.backend.winai.dto.response.MessageResponse;
import com.backend.winai.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/register
     * Registra uma nova empresa e usuário (Checkout do frontend)
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * POST /api/v1/auth/login
     * Autentica usuário e retorna tokens JWT
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * POST /api/v1/auth/refresh
     * Atualiza o access token usando refresh token
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    /**
     * POST /api/v1/auth/forgot-password
     * Solicita recuperação de senha
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    /**
     * POST /api/v1/auth/reset-password
     * Reseta a senha com o token recebido por e-mail
     */
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    /**
     * POST /api/v1/auth/logout
     * Invalida o refresh token
     */
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(@RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(MessageResponse.success("Logout realizado com sucesso"));
    }
}
