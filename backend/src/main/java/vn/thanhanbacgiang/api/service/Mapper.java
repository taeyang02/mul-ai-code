package vn.thanhanbacgiang.api.service;

import vn.thanhanbacgiang.api.domain.Category;
import vn.thanhanbacgiang.api.domain.Company;
import vn.thanhanbacgiang.api.domain.ContactInfo;
import vn.thanhanbacgiang.api.domain.Product;
import vn.thanhanbacgiang.api.domain.QuoteRequest;
import vn.thanhanbacgiang.api.domain.SiteAdvantage;
import vn.thanhanbacgiang.api.domain.SiteSettings;
import vn.thanhanbacgiang.api.dto.AdvantageResponse;
import vn.thanhanbacgiang.api.dto.CategoryResponse;
import vn.thanhanbacgiang.api.dto.CategorySummary;
import vn.thanhanbacgiang.api.dto.CompanyResponse;
import vn.thanhanbacgiang.api.dto.ContactResponse;
import vn.thanhanbacgiang.api.dto.NavItemDto;
import vn.thanhanbacgiang.api.dto.ProductResponse;
import vn.thanhanbacgiang.api.dto.QuoteRequestResponse;
import vn.thanhanbacgiang.api.dto.SiteResponse;

import java.util.List;
import java.util.Map;

final class Mapper {

    private Mapper() {}

    static SiteResponse toSite(SiteSettings s) {
        List<NavItemDto> nav = s.getNavItems() == null ? List.of() : s.getNavItems().stream()
                .map(Mapper::toNavItem)
                .toList();
        return new SiteResponse(
                s.getBrandName(),
                s.getTagline(),
                s.getHeroTitle(),
                s.getHeroSubtitle(),
                s.getHeroCtaLabel(),
                s.getHeroBadgePrimary(),
                s.getHeroBadgeSecondary(),
                s.getSeoTitle(),
                s.getSeoDescription(),
                nav
        );
    }

    private static NavItemDto toNavItem(Map<String, String> item) {
        return new NavItemDto(
                item.getOrDefault("label", ""),
                item.getOrDefault("href", "")
        );
    }

    static CompanyResponse toCompany(Company c) {
        return new CompanyResponse(
                c.getLegalName(),
                c.getTradeName(),
                c.getFoundedOn(),
                c.getIndustry(),
                c.getServiceArea(),
                c.getStatusLabel(),
                c.getMission(),
                c.getHighlightTitle(),
                c.getHighlightBody(),
                c.getProjectsCompletedLabel(),
                c.getPartnersLabel(),
                c.getTaxCode()
        );
    }

    static CategoryResponse toCategory(Category c) {
        return new CategoryResponse(c.getId(), c.getSlug(), c.getName(), c.getDescription(), c.getSortOrder());
    }

    static CategorySummary toCategorySummary(Category c) {
        return new CategorySummary(c.getId(), c.getSlug(), c.getName());
    }

    static ProductResponse toProduct(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getSlug(),
                p.getName(),
                p.getShortDescription(),
                p.getDescription(),
                p.getBrand(),
                p.getSpecsSummary(),
                p.getFeatures() == null ? List.of() : List.copyOf(p.getFeatures()),
                p.getImageUrl(),
                p.isFeatured(),
                p.getSortOrder(),
                toCategorySummary(p.getCategory())
        );
    }

    static AdvantageResponse toAdvantage(SiteAdvantage a) {
        return new AdvantageResponse(a.getId(), a.getTitle(), a.getDescription(), a.getIconKey(), a.getSortOrder());
    }

    static ContactResponse toContact(ContactInfo c) {
        return new ContactResponse(
                c.getAddressOld(),
                c.getAddressNew(),
                c.getAddressNote(),
                c.getHotlineDisplay(),
                c.getHotlineE164(),
                c.getHotlineContactName(),
                c.getEmail(),
                c.getZaloUrl(),
                c.getFacebookUrl(),
                c.getBusinessHoursWeekday(),
                c.getBusinessHoursWeekend(),
                c.getMapEmbedUrl()
        );
    }

    static QuoteRequestResponse toQuote(QuoteRequest q) {
        return new QuoteRequestResponse(q.getId(), q.getStatus(), q.getCreatedAt());
    }
}
