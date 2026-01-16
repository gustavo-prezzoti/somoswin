package com.backend.winai.service;

import com.backend.winai.dto.request.UpdateProfileRequest;
import com.backend.winai.dto.response.AuthResponse;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SupabaseStorageService storageService;

    /**
     * Obtém os dados do usuário autenticado
     */
    @Transactional(readOnly = true)
    public AuthResponse.UserDTO getCurrentUser(User user) {
        User fullUser = userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        AuthResponse.CompanyDTO companyDTO = null;
        if (fullUser.getCompany() != null) {
            companyDTO = AuthResponse.CompanyDTO.builder()
                    .id(fullUser.getCompany().getId())
                    .name(fullUser.getCompany().getName())
                    .segment(fullUser.getCompany().getSegment())
                    .plan(fullUser.getCompany().getPlan())
                    .build();
        }

        return AuthResponse.UserDTO.builder()
                .id(fullUser.getId())
                .email(fullUser.getEmail())
                .name(fullUser.getName())
                .role(fullUser.getRole().name())
                .plan(fullUser.getCompany() != null ? fullUser.getCompany().getPlan().name() : "STARTER")
                .company(companyDTO)
                .avatarUrl(fullUser.getAvatarUrl())
                .phone(fullUser.getPhone())
                .build();
    }

    /**
     * Atualiza o perfil do usuário
     */
    @Transactional
    public AuthResponse.UserDTO updateProfile(User user, UpdateProfileRequest request) {
        User fullUser = userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (request.getName() != null && !request.getName().isEmpty()) {
            fullUser.setName(request.getName());
        }

        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            // Verificar se o email já está em uso por outro usuário
            if (!fullUser.getEmail().equals(request.getEmail())) {
                if (userRepository.existsByEmail(request.getEmail())) {
                    throw new RuntimeException("Este email já está em uso");
                }
                fullUser.setEmail(request.getEmail());
            }
        }

        if (request.getPhone() != null) {
            fullUser.setPhone(request.getPhone());
        }

        fullUser = userRepository.save(fullUser);
        return getCurrentUser(fullUser);
    }

    /**
     * Faz upload da foto de perfil
     */
    @Transactional
    public AuthResponse.UserDTO uploadAvatar(User user, MultipartFile file) throws IOException {
        User fullUser = userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Deletar avatar antigo se existir
        if (fullUser.getAvatarUrl() != null && !fullUser.getAvatarUrl().isEmpty()) {
            storageService.deleteAvatar(fullUser.getAvatarUrl());
        }

        // Fazer upload do novo avatar
        String avatarUrl = storageService.uploadAvatar(file, fullUser.getId());
        fullUser.setAvatarUrl(avatarUrl);

        fullUser = userRepository.save(fullUser);
        return getCurrentUser(fullUser);
    }
}

