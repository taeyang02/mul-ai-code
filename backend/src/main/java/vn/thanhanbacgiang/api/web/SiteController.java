package vn.thanhanbacgiang.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.thanhanbacgiang.api.dto.AdvantageResponse;
import vn.thanhanbacgiang.api.dto.SiteResponse;
import vn.thanhanbacgiang.api.service.ContentService;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class SiteController {

    private final ContentService contentService;

    public SiteController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/site")
    public SiteResponse getSite() {
        return contentService.getSite();
    }

    @GetMapping("/site/advantages")
    public List<AdvantageResponse> listAdvantages() {
        return contentService.listAdvantages();
    }
}
