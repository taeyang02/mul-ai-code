package vn.thanhanbacgiang.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "site_settings")
public class SiteSettings {

    @Id
    private UUID id;

    @Column(name = "brand_name", nullable = false)
    private String brandName;

    private String tagline;

    @Column(name = "hero_title", nullable = false)
    private String heroTitle;

    @Column(name = "hero_subtitle", columnDefinition = "TEXT")
    private String heroSubtitle;

    @Column(name = "hero_cta_label")
    private String heroCtaLabel;

    @Column(name = "hero_badge_primary")
    private String heroBadgePrimary;

    @Column(name = "hero_badge_secondary")
    private String heroBadgeSecondary;

    @Column(name = "seo_title")
    private String seoTitle;

    @Column(name = "seo_description", columnDefinition = "TEXT")
    private String seoDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "nav_items", nullable = false, columnDefinition = "jsonb")
    private List<Map<String, String>> navItems = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public String getBrandName() { return brandName; }
    public String getTagline() { return tagline; }
    public String getHeroTitle() { return heroTitle; }
    public String getHeroSubtitle() { return heroSubtitle; }
    public String getHeroCtaLabel() { return heroCtaLabel; }
    public String getHeroBadgePrimary() { return heroBadgePrimary; }
    public String getHeroBadgeSecondary() { return heroBadgeSecondary; }
    public String getSeoTitle() { return seoTitle; }
    public String getSeoDescription() { return seoDescription; }
    public List<Map<String, String>> getNavItems() { return navItems; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
