package vn.thanhanbacgiang.api.dto;

import vn.thanhanbacgiang.api.domain.QuoteRequest;

import java.time.Instant;
import java.util.UUID;

public record QuoteRequestResponse(
        UUID id,
        QuoteRequest.Status status,
        Instant createdAt
) {}
