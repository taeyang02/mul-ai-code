package vn.thanhanbacgiang.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.thanhanbacgiang.api.dto.ContactResponse;
import vn.thanhanbacgiang.api.service.ContentService;

@RestController
@RequestMapping("/api/v1")
public class ContactController {

    private final ContentService contentService;

    public ContactController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/contact")
    public ContactResponse getContact() {
        return contentService.getContact();
    }
}
