package vn.thanhanbacgiang.api.dto;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        List<FieldErrorDetail> details
) {
    public record FieldErrorDetail(String field, String message) {}
}
