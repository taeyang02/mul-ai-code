package vn.thanhanbacgiang.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.thanhanbacgiang.api.domain.Category;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByActiveTrueOrderBySortOrderAsc();
}
