package vn.thanhanbacgiang.api.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.thanhanbacgiang.api.config.AppProperties;
import vn.thanhanbacgiang.api.domain.QuoteRequest;
import vn.thanhanbacgiang.api.dto.QuoteRequestCreate;
import vn.thanhanbacgiang.api.dto.QuoteRequestResponse;
import vn.thanhanbacgiang.api.exception.BadRequestException;
import vn.thanhanbacgiang.api.exception.RateLimitExceededException;
import vn.thanhanbacgiang.api.repository.QuoteRequestRepository;

import java.time.Instant;

@Service
public class QuoteRequestService {

    private final QuoteRequestRepository quoteRequestRepository;
    private final AppProperties appProperties;

    public QuoteRequestService(QuoteRequestRepository quoteRequestRepository, AppProperties appProperties) {
        this.quoteRequestRepository = quoteRequestRepository;
        this.appProperties = appProperties;
    }

    @Transactional
    public QuoteRequestResponse create(QuoteRequestCreate request, String clientIp, String userAgent) {
        if (request.website() != null && !request.website().isBlank()) {
            throw new BadRequestException("SPAM_REJECTED", "Request rejected");
        }

        String ip = clientIp == null || clientIp.isBlank() ? "unknown" : clientIp;
        var rate = appProperties.getQuote().getRateLimit();
        Instant windowStart = Instant.now().minusSeconds(rate.getWindowSeconds());
        long recent = quoteRequestRepository.countByClientIpAndCreatedAtAfter(ip, windowStart);
        if (recent >= rate.getMaxRequests()) {
            throw new RateLimitExceededException("Too many quote requests. Please try again later.");
        }

        QuoteRequest entity = new QuoteRequest();
        entity.setFullName(request.fullName().trim());
        entity.setPhone(request.phone().trim());
        entity.setEmail(trimToNull(request.email()));
        entity.setCompanyName(trimToNull(request.companyName()));
        entity.setProductInterest(trimToNull(request.productInterest()));
        entity.setMessage(request.message().trim());
        entity.setSourcePage(trimToNull(request.sourcePage()));
        entity.setClientIp(ip);
        entity.setUserAgent(trimToNull(userAgent));
        entity.setStatus(QuoteRequest.Status.NEW);

        return Mapper.toQuote(quoteRequestRepository.save(entity));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
