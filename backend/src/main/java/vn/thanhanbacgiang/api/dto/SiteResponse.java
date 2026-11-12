package vn.thanhanbacgiang.api.dto;

import java.util.List;

public record SiteResponse(
        String brandName,
        String tagline,
        String heroTitle,
        String heroSubtitle,
        String heroCtaLabel,
        String heroBadgePrimary,
        String heroBadgeSecondary,
        String seoTitle,
        String seoDescription,
        List<NavItemDto> navItems
) {}
