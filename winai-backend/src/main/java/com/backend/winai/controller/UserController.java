package com.backend.winai.controller;

import com.backend.winai.dto.request.UpdateProfileRequest;
import com.backend.winai.dto.response.AuthResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * GET /api/v1/user/me
     * Retorna os dados do usuário autenticado
     */
    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserDTO> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getCurrentUser(user));
    }

    /**
     * PUT /api/v1/user/me
     * Atualiza o perfil do usuário
     */
    @PutMapping("/me")
    public ResponseEntity<AuthResponse.UserDTO> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(user, request));
    }

    /**
     * POST /api/v1/user/avatar
     * Faz upload da foto de perfil
     */
    @PostMapping("/avatar")
    public ResponseEntity<AuthResponse.UserDTO> uploadAvatar(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(userService.uploadAvatar(user, file));
    }
}
