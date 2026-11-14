package vn.thanhanbacgiang.api.dto;

import java.util.UUID;

public record AdvantageResponse(
        UUID id,
        String title,
        String description,
        String iconKey,
        int sortOrder
) {}
