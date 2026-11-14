package vn.thanhanbacgiang.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "company")
public class Company {

    @Id
    private UUID id;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "trade_name")
    private String tradeName;

    @Column(name = "founded_on")
    private LocalDate foundedOn;

    private String industry;

    @Column(name = "service_area")
    private String serviceArea;

    @Column(name = "status_label")
    private String statusLabel;

    @Column(columnDefinition = "TEXT")
    private String mission;

    @Column(name = "highlight_title")
    private String highlightTitle;

    @Column(name = "highlight_body", columnDefinition = "TEXT")
    private String highlightBody;

    @Column(name = "projects_completed_label")
    private String projectsCompletedLabel;

    @Column(name = "partners_label")
    private String partnersLabel;

    @Column(name = "tax_code")
    private String taxCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public String getLegalName() { return legalName; }
    public String getTradeName() { return tradeName; }
    public LocalDate getFoundedOn() { return foundedOn; }
    public String getIndustry() { return industry; }
    public String getServiceArea() { return serviceArea; }
    public String getStatusLabel() { return statusLabel; }
    public String getMission() { return mission; }
    public String getHighlightTitle() { return highlightTitle; }
    public String getHighlightBody() { return highlightBody; }
    public String getProjectsCompletedLabel() { return projectsCompletedLabel; }
    public String getPartnersLabel() { return partnersLabel; }
    public String getTaxCode() { return taxCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
