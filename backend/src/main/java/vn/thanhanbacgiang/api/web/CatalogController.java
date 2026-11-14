package vn.thanhanbacgiang.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.thanhanbacgiang.api.dto.CategoryResponse;
import vn.thanhanbacgiang.api.dto.PageResponse;
import vn.thanhanbacgiang.api.dto.ProductResponse;
import vn.thanhanbacgiang.api.service.ContentService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    private final ContentService contentService;

    public CatalogController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/categories")
    public List<CategoryResponse> listCategories() {
        return contentService.listCategories();
    }

    @GetMapping("/products")
    public PageResponse<ProductResponse> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) String q
    ) {
        return contentService.listProducts(page, size, category, featured, q);
    }

    @GetMapping("/products/{id}")
    public ProductResponse getProduct(@PathVariable UUID id) {
        return contentService.getProduct(id);
    }
}
