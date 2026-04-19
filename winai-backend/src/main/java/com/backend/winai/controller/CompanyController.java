package com.backend.winai.controller;

import com.backend.winai.dto.request.CreateAccessInvitationRequest;
import com.backend.winai.dto.request.UpdateCompanyProfileRequest;
import com.backend.winai.dto.response.AccessInvitationListItemResponse;
import com.backend.winai.dto.response.CompanyMemberResponse;
import com.backend.winai.dto.response.CompanyProfileResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.CompanyTeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyTeamService companyTeamService;

    @GetMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(companyTeamService.getCompanyProfile(user));
    }

    @PatchMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> patchProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateCompanyProfileRequest request) {
        return ResponseEntity.ok(companyTeamService.updateCompanyProfile(user, request));
    }

    @GetMapping("/members")
    public ResponseEntity<List<CompanyMemberResponse>> listMembers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(companyTeamService.listMembers(user));
    }

    @GetMapping("/invitations")
    public ResponseEntity<List<AccessInvitationListItemResponse>> listInvitations(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(companyTeamService.listPendingInvitations(user));
    }

    @PostMapping("/invitations")
    public ResponseEntity<AccessInvitationListItemResponse> createInvitation(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateAccessInvitationRequest request) {
        return ResponseEntity.ok(companyTeamService.createInvitation(user, request));
    }

    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<Void> revokeInvitation(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        companyTeamService.revokeInvitation(user, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        companyTeamService.removeMember(user, userId);
        return ResponseEntity.noContent().build();
    }
}
