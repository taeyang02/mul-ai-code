package vn.thanhanbacgiang.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record QuoteRequestCreate(
        @NotBlank @Size(min = 2, max = 150) String fullName,
        @NotBlank @Size(min = 8, max = 30)
        @Pattern(regexp = "^[0-9+()\\s.-]+$", message = "phone format is invalid")
        String phone,
        @Email @Size(max = 255) String email,
        @Size(max = 255) String companyName,
        @Size(max = 255) String productInterest,
        @NotBlank @Size(min = 5, max = 2000) String message,
        @Size(max = 255) String sourcePage,
        String website
) {}
