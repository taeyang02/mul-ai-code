package vn.thanhanbacgiang.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.thanhanbacgiang.api.domain.Product;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query(
            value = """
                    SELECT p FROM Product p
                    JOIN p.category c
                    WHERE p.active = TRUE
                      AND (:categorySlug = '' OR c.slug = :categorySlug)
                      AND (:featured IS NULL OR p.featured = :featured)
                      AND (
                           :q = ''
                           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                           OR (p.shortDescription IS NOT NULL AND LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :q, '%')))
                           OR (p.brand IS NOT NULL AND LOWER(p.brand) LIKE LOWER(CONCAT('%', :q, '%')))
                      )
                    """,
            countQuery = """
                    SELECT COUNT(p) FROM Product p
                    JOIN p.category c
                    WHERE p.active = TRUE
                      AND (:categorySlug = '' OR c.slug = :categorySlug)
                      AND (:featured IS NULL OR p.featured = :featured)
                      AND (
                           :q = ''
                           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                           OR (p.shortDescription IS NOT NULL AND LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :q, '%')))
                           OR (p.brand IS NOT NULL AND LOWER(p.brand) LIKE LOWER(CONCAT('%', :q, '%')))
                      )
                    """
    )
    Page<Product> search(
            @Param("categorySlug") String categorySlug,
            @Param("featured") Boolean featured,
            @Param("q") String q,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM Product p
            JOIN FETCH p.category
            WHERE p.id = :id AND p.active = TRUE
            """)
    Optional<Product> findActiveById(@Param("id") UUID id);
}
