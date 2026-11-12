package vn.thanhanbacgiang.api.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.thanhanbacgiang.api.dto.QuoteRequestCreate;
import vn.thanhanbacgiang.api.dto.QuoteRequestResponse;
import vn.thanhanbacgiang.api.service.QuoteRequestService;

@RestController
@RequestMapping("/api/v1")
public class QuoteRequestController {

    private final QuoteRequestService quoteRequestService;

    public QuoteRequestController(QuoteRequestService quoteRequestService) {
        this.quoteRequestService = quoteRequestService;
    }

    @PostMapping("/quote-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public QuoteRequestResponse create(
            @Valid @RequestBody QuoteRequestCreate request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = resolveClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return quoteRequestService.create(request, clientIp, userAgent);
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
