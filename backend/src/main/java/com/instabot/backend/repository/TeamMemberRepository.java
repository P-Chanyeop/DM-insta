package com.instabot.backend.repository;

import com.instabot.backend.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findByTeamOwnerId(Long teamOwnerId);
    List<TeamMember> findByUserId(Long userId);
    Optional<TeamMember> findByTeamOwnerIdAndUserId(Long teamOwnerId, Long userId);
    boolean existsByTeamOwnerIdAndUserId(Long teamOwnerId, Long userId);
    void deleteByTeamOwnerIdAndUserId(Long teamOwnerId, Long userId);
}
