package vn.thanhanbacgiang.api.dto;

import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String slug,
        String name,
        String description,
        int sortOrder
) {}
