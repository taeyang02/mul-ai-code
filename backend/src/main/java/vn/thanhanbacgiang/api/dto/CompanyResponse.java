package vn.thanhanbacgiang.api.dto;

import java.time.LocalDate;

public record CompanyResponse(
        String legalName,
        String tradeName,
        LocalDate foundedOn,
        String industry,
        String serviceArea,
        String statusLabel,
        String mission,
        String highlightTitle,
        String highlightBody,
        String projectsCompletedLabel,
        String partnersLabel,
        String taxCode
) {}
