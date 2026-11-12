package vn.thanhanbacgiang.api.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.thanhanbacgiang.api.dto.AdvantageResponse;
import vn.thanhanbacgiang.api.dto.CategoryResponse;
import vn.thanhanbacgiang.api.dto.CompanyResponse;
import vn.thanhanbacgiang.api.dto.ContactResponse;
import vn.thanhanbacgiang.api.dto.PageResponse;
import vn.thanhanbacgiang.api.dto.ProductResponse;
import vn.thanhanbacgiang.api.dto.SiteResponse;
import vn.thanhanbacgiang.api.exception.ResourceNotFoundException;
import vn.thanhanbacgiang.api.repository.CategoryRepository;
import vn.thanhanbacgiang.api.repository.CompanyRepository;
import vn.thanhanbacgiang.api.repository.ContactInfoRepository;
import vn.thanhanbacgiang.api.repository.ProductRepository;
import vn.thanhanbacgiang.api.repository.SiteAdvantageRepository;
import vn.thanhanbacgiang.api.repository.SiteSettingsRepository;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ContentService {

    private final SiteSettingsRepository siteSettingsRepository;
    private final CompanyRepository companyRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final SiteAdvantageRepository siteAdvantageRepository;
    private final ContactInfoRepository contactInfoRepository;

    public ContentService(
            SiteSettingsRepository siteSettingsRepository,
            CompanyRepository companyRepository,
            CategoryRepository categoryRepository,
            ProductRepository productRepository,
            SiteAdvantageRepository siteAdvantageRepository,
            ContactInfoRepository contactInfoRepository
    ) {
        this.siteSettingsRepository = siteSettingsRepository;
        this.companyRepository = companyRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.siteAdvantageRepository = siteAdvantageRepository;
        this.contactInfoRepository = contactInfoRepository;
    }

    public SiteResponse getSite() {
        return siteSettingsRepository.findFirstByOrderByUpdatedAtDesc()
                .map(Mapper::toSite)
                .orElseThrow(() -> new ResourceNotFoundException("Site settings not found"));
    }

    public CompanyResponse getCompany() {
        return companyRepository.findFirstByOrderByUpdatedAtDesc()
                .map(Mapper::toCompany)
                .orElseThrow(() -> new ResourceNotFoundException("Company profile not found"));
    }

    public List<CategoryResponse> listCategories() {
        return categoryRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(Mapper::toCategory)
                .toList();
    }

    public PageResponse<ProductResponse> listProducts(int page, int size, String category, Boolean featured, String q) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String categorySlug = blankToEmpty(category);
        String query = blankToEmpty(q);

        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by("sortOrder").ascending().and(Sort.by("name").ascending()));
        Page<ProductResponse> result = productRepository.search(categorySlug, featured, query, pageable)
                .map(Mapper::toProduct);

        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    public ProductResponse getProduct(UUID id) {
        return productRepository.findActiveById(id)
                .map(Mapper::toProduct)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    public List<AdvantageResponse> listAdvantages() {
        return siteAdvantageRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(Mapper::toAdvantage)
                .toList();
    }

    public ContactResponse getContact() {
        return contactInfoRepository.findFirstByOrderByUpdatedAtDesc()
                .map(Mapper::toContact)
                .orElseThrow(() -> new ResourceNotFoundException("Contact info not found"));
    }

    private static String blankToEmpty(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim();
    }
}
