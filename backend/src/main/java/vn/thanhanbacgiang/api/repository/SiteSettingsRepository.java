package vn.thanhanbacgiang.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.thanhanbacgiang.api.domain.SiteSettings;

import java.util.Optional;
import java.util.UUID;

public interface SiteSettingsRepository extends JpaRepository<SiteSettings, UUID> {
    Optional<SiteSettings> findFirstByOrderByUpdatedAtDesc();
}
