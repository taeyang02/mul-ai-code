package vn.thanhanbacgiang.api.dto;

public record ContactResponse(
        String addressOld,
        String addressNew,
        String addressNote,
        String hotlineDisplay,
        String hotlineE164,
        String hotlineContactName,
        String email,
        String zaloUrl,
        String facebookUrl,
        String businessHoursWeekday,
        String businessHoursWeekend,
        String mapEmbedUrl
) {}
