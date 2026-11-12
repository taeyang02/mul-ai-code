package vn.thanhanbacgiang.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.thanhanbacgiang.api.domain.ContactInfo;

import java.util.Optional;
import java.util.UUID;

public interface ContactInfoRepository extends JpaRepository<ContactInfo, UUID> {
    Optional<ContactInfo> findFirstByOrderByUpdatedAtDesc();
}
