package com.instabot.backend.repository;

import com.instabot.backend.entity.GroupBuyParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupBuyParticipantRepository extends JpaRepository<GroupBuyParticipant, Long> {
    List<GroupBuyParticipant> findByGroupBuyIdOrderByAppliedAtDesc(Long groupBuyId);

    List<GroupBuyParticipant> findByGroupBuyIdAndStatus(Long groupBuyId, GroupBuyParticipant.ParticipantStatus status);

    Optional<GroupBuyParticipant> findByGroupBuyIdAndContactId(Long groupBuyId, Long contactId);

    long countByGroupBuyId(Long groupBuyId);

    @Query("SELECT p.status, COUNT(p) FROM GroupBuyParticipant p WHERE p.groupBuy.id = :groupBuyId GROUP BY p.status")
    List<Object[]> countByGroupBuyIdGroupByStatus(@Param("groupBuyId") Long groupBuyId);
}
