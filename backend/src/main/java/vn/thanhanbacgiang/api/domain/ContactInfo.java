package vn.thanhanbacgiang.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contact_info")
public class ContactInfo {

    @Id
    private UUID id;

    @Column(name = "address_old", columnDefinition = "TEXT")
    private String addressOld;

    @Column(name = "address_new", columnDefinition = "TEXT")
    private String addressNew;

    @Column(name = "address_note", columnDefinition = "TEXT")
    private String addressNote;

    @Column(name = "hotline_display", nullable = false)
    private String hotlineDisplay;

    @Column(name = "hotline_e164", nullable = false)
    private String hotlineE164;

    @Column(name = "hotline_contact_name")
    private String hotlineContactName;

    private String email;

    @Column(name = "zalo_url")
    private String zaloUrl;

    @Column(name = "facebook_url")
    private String facebookUrl;

    @Column(name = "business_hours_weekday")
    private String businessHoursWeekday;

    @Column(name = "business_hours_weekend")
    private String businessHoursWeekend;

    @Column(name = "map_embed_url")
    private String mapEmbedUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public String getAddressOld() { return addressOld; }
    public String getAddressNew() { return addressNew; }
    public String getAddressNote() { return addressNote; }
    public String getHotlineDisplay() { return hotlineDisplay; }
    public String getHotlineE164() { return hotlineE164; }
    public String getHotlineContactName() { return hotlineContactName; }
    public String getEmail() { return email; }
    public String getZaloUrl() { return zaloUrl; }
    public String getFacebookUrl() { return facebookUrl; }
    public String getBusinessHoursWeekday() { return businessHoursWeekday; }
    public String getBusinessHoursWeekend() { return businessHoursWeekend; }
    public String getMapEmbedUrl() { return mapEmbedUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
