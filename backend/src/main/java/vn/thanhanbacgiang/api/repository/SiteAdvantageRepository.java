package vn.thanhanbacgiang.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.thanhanbacgiang.api.domain.SiteAdvantage;

import java.util.List;
import java.util.UUID;

public interface SiteAdvantageRepository extends JpaRepository<SiteAdvantage, UUID> {
    List<SiteAdvantage> findByActiveTrueOrderBySortOrderAsc();
}
