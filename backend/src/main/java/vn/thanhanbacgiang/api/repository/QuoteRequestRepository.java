package vn.thanhanbacgiang.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.thanhanbacgiang.api.domain.QuoteRequest;

import java.time.Instant;
import java.util.UUID;

public interface QuoteRequestRepository extends JpaRepository<QuoteRequest, UUID> {
    long countByClientIpAndCreatedAtAfter(String clientIp, Instant after);
}
