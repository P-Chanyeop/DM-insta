package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.TeamDto;
import com.instabot.backend.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping("/members")
    public ResponseEntity<List<TeamDto.TeamMemberResponse>> listMembers() {
        return ResponseEntity.ok(teamService.listMembers(SecurityUtils.currentUserId()));
    }

    @PostMapping("/members")
    public ResponseEntity<TeamDto.TeamMemberResponse> inviteMember(@Valid @RequestBody TeamDto.InviteMemberRequest request) {
        return ResponseEntity.ok(teamService.inviteMember(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/members/{memberId}/role")
    public ResponseEntity<TeamDto.TeamMemberResponse> updateMemberRole(
            @PathVariable Long memberId,
            @Valid @RequestBody TeamDto.UpdateRoleRequest request) {
        return ResponseEntity.ok(teamService.updateMemberRole(SecurityUtils.currentUserId(), memberId, request));
    }

    @DeleteMapping("/members/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long memberId) {
        teamService.removeMember(SecurityUtils.currentUserId(), memberId);
        return ResponseEntity.noContent().build();
    }
}
