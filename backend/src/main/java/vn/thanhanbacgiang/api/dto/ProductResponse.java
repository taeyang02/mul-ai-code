package vn.thanhanbacgiang.api.dto;

import java.util.List;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String slug,
        String name,
        String shortDescription,
        String description,
        String brand,
        String specsSummary,
        List<String> features,
        String imageUrl,
        boolean featured,
        int sortOrder,
        CategorySummary category
) {}
