package vn.thanhanbacgiang.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.thanhanbacgiang.api.dto.CompanyResponse;
import vn.thanhanbacgiang.api.service.ContentService;

@RestController
@RequestMapping("/api/v1")
public class CompanyController {

    private final ContentService contentService;

    public CompanyController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/company")
    public CompanyResponse getCompany() {
        return contentService.getCompany();
    }
}
