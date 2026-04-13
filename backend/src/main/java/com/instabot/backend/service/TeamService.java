package com.instabot.backend.service;

import com.instabot.backend.dto.TeamDto;
import com.instabot.backend.entity.TeamMember;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.TeamMemberRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    // ─── 팀 소속 확인 ───

    /**
     * 현재 사용자가 속한 팀의 owner id를 반환.
     * 본인이 OWNER면 본인 id, 아니면 teamOwnerId.
     */
    public Long getTeamOwnerId(Long userId) {
        List<TeamMember> memberships = teamMemberRepository.findByUserId(userId);
        if (memberships.isEmpty()) {
            // 팀 멤버십이 없으면 본인이 owner (레거시 호환)
            return userId;
        }
        // OWNER 역할이 있으면 해당 팀의 ownerId 반환
        for (TeamMember m : memberships) {
            if (m.getRole() == TeamMember.Role.OWNER) {
                return m.getTeamOwnerId();
            }
        }
        // OWNER가 아니면 첫 번째 멤버십의 teamOwnerId 반환
        return memberships.get(0).getTeamOwnerId();
    }

    // ─── 팀원 목록 ───

    public List<TeamDto.TeamMemberResponse> listMembers(Long currentUserId) {
        Long teamOwnerId = getTeamOwnerId(currentUserId);
        List<TeamMember> members = teamMemberRepository.findByTeamOwnerId(teamOwnerId);

        return members.stream()
                .map(member -> {
                    User user = userRepository.findById(member.getUserId()).orElse(null);
                    return TeamDto.TeamMemberResponse.builder()
                            .id(member.getId())
                            .userId(member.getUserId())
                            .email(user != null ? user.getEmail() : null)
                            .name(user != null ? user.getName() : null)
                            .role(member.getRole().name())
                            .joinedAt(member.getJoinedAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─── 팀원 초대 ───

    @Transactional
    public TeamDto.TeamMemberResponse inviteMember(Long currentUserId, TeamDto.InviteMemberRequest request) {
        Long teamOwnerId = getTeamOwnerId(currentUserId);
        TeamMember currentMember = teamMemberRepository.findByTeamOwnerIdAndUserId(teamOwnerId, currentUserId)
                .orElseThrow(() -> new BadRequestException("팀에 속해있지 않습니다."));

        // 권한 확인: OWNER 또는 ADMIN만 초대 가능
        if (currentMember.getRole() != TeamMember.Role.OWNER
                && currentMember.getRole() != TeamMember.Role.ADMIN) {
            throw new BadRequestException("팀원을 초대할 권한이 없습니다.");
        }

        // 초대할 역할 파싱
        TeamMember.Role inviteRole;
        try {
            inviteRole = TeamMember.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("유효하지 않은 역할입니다: " + request.getRole());
        }

        // OWNER 역할로는 초대 불가
        if (inviteRole == TeamMember.Role.OWNER) {
            throw new BadRequestException("OWNER 역할로는 초대할 수 없습니다.");
        }

        // ADMIN은 MEMBER/VIEWER만 초대 가능
        if (currentMember.getRole() == TeamMember.Role.ADMIN
                && inviteRole == TeamMember.Role.ADMIN) {
            throw new BadRequestException("ADMIN은 ADMIN 역할로 초대할 수 없습니다.");
        }

        // 초대할 사용자 조회
        User invitedUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("해당 이메일의 사용자를 찾을 수 없습니다. 먼저 회원가입이 필요합니다."));

        // 이미 팀원인지 확인
        if (teamMemberRepository.existsByTeamOwnerIdAndUserId(teamOwnerId, invitedUser.getId())) {
            throw new BadRequestException("이미 팀에 속한 사용자입니다.");
        }

        TeamMember newMember = TeamMember.builder()
                .teamOwnerId(teamOwnerId)
                .userId(invitedUser.getId())
                .role(inviteRole)
                .joinedAt(LocalDateTime.now())
                .build();

        teamMemberRepository.save(newMember);

        return TeamDto.TeamMemberResponse.builder()
                .id(newMember.getId())
                .userId(invitedUser.getId())
                .email(invitedUser.getEmail())
                .name(invitedUser.getName())
                .role(newMember.getRole().name())
                .joinedAt(newMember.getJoinedAt())
                .build();
    }

    // ─── 역할 변경 ───

    @Transactional
    public TeamDto.TeamMemberResponse updateMemberRole(Long currentUserId, Long memberId, TeamDto.UpdateRoleRequest request) {
        Long teamOwnerId = getTeamOwnerId(currentUserId);
        TeamMember currentMember = teamMemberRepository.findByTeamOwnerIdAndUserId(teamOwnerId, currentUserId)
                .orElseThrow(() -> new BadRequestException("팀에 속해있지 않습니다."));

        // OWNER만 역할 변경 가능
        if (currentMember.getRole() != TeamMember.Role.OWNER) {
            throw new BadRequestException("역할을 변경할 권한이 없습니다. OWNER만 가능합니다.");
        }

        TeamMember targetMember = teamMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("팀원을 찾을 수 없습니다."));

        // 같은 팀인지 확인
        if (!targetMember.getTeamOwnerId().equals(teamOwnerId)) {
            throw new BadRequestException("같은 팀의 멤버가 아닙니다.");
        }

        // OWNER 역할은 변경 불가
        if (targetMember.getRole() == TeamMember.Role.OWNER) {
            throw new BadRequestException("OWNER의 역할은 변경할 수 없습니다.");
        }

        TeamMember.Role newRole;
        try {
            newRole = TeamMember.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("유효하지 않은 역할입니다: " + request.getRole());
        }

        if (newRole == TeamMember.Role.OWNER) {
            throw new BadRequestException("OWNER 역할로 변경할 수 없습니다.");
        }

        targetMember.setRole(newRole);
        teamMemberRepository.save(targetMember);

        User user = userRepository.findById(targetMember.getUserId()).orElse(null);
        return TeamDto.TeamMemberResponse.builder()
                .id(targetMember.getId())
                .userId(targetMember.getUserId())
                .email(user != null ? user.getEmail() : null)
                .name(user != null ? user.getName() : null)
                .role(targetMember.getRole().name())
                .joinedAt(targetMember.getJoinedAt())
                .build();
    }

    // ─── 팀원 제거 ───

    @Transactional
    public void removeMember(Long currentUserId, Long memberId) {
        Long teamOwnerId = getTeamOwnerId(currentUserId);
        TeamMember currentMember = teamMemberRepository.findByTeamOwnerIdAndUserId(teamOwnerId, currentUserId)
                .orElseThrow(() -> new BadRequestException("팀에 속해있지 않습니다."));

        // OWNER 또는 ADMIN만 제거 가능
        if (currentMember.getRole() != TeamMember.Role.OWNER
                && currentMember.getRole() != TeamMember.Role.ADMIN) {
            throw new BadRequestException("팀원을 제거할 권한이 없습니다.");
        }

        TeamMember targetMember = teamMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("팀원을 찾을 수 없습니다."));

        // 같은 팀인지 확인
        if (!targetMember.getTeamOwnerId().equals(teamOwnerId)) {
            throw new BadRequestException("같은 팀의 멤버가 아닙니다.");
        }

        // OWNER는 제거 불가
        if (targetMember.getRole() == TeamMember.Role.OWNER) {
            throw new BadRequestException("OWNER는 제거할 수 없습니다.");
        }

        // ADMIN은 MEMBER/VIEWER만 제거 가능
        if (currentMember.getRole() == TeamMember.Role.ADMIN
                && targetMember.getRole() == TeamMember.Role.ADMIN) {
            throw new BadRequestException("ADMIN은 다른 ADMIN을 제거할 수 없습니다.");
        }

        teamMemberRepository.delete(targetMember);
    }
}
