package vn.thanhanbacgiang.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.RefreshMode.BEFORE_CLASS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@AutoConfigureEmbeddedDatabase(type = AutoConfigureEmbeddedDatabase.DatabaseType.POSTGRES, provider = ZONKY, refresh = BEFORE_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @Order(1)
    void flywaySeededSiteAndCompany() throws Exception {
        mockMvc.perform(get("/api/v1/site"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.brandName").value("Thanh An Bắc Giang"))
                .andExpect(jsonPath("$.heroTitle").value("Vật liệu xây dựng Chất lượng vượt trội"))
                .andExpect(jsonPath("$.navItems[0].label").value("Trang chủ"));

        mockMvc.perform(get("/api/v1/company"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legalName").value("CÔNG TY TNHH THANH AN BẮC GIANG"))
                .andExpect(jsonPath("$.taxCode").doesNotExist())
                .andExpect(jsonPath("$.foundedOn").value("2015-02-06"));
    }

    @Test
    @Order(2)
    void catalogAndAdvantagesAndContact() throws Exception {
        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].slug").value("thep"));

        MvcResult products = mockMvc.perform(get("/api/v1/products").param("featured", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].name").exists())
                .andExpect(jsonPath("$.page").value(0))
                .andReturn();

        JsonNode root = objectMapper.readTree(products.getResponse().getContentAsString());
        String productId = root.path("items").get(0).path("id").asText();
        assertThat(productId).isNotBlank();

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.slug").exists());

        mockMvc.perform(get("/api/v1/site/advantages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4));

        mockMvc.perform(get("/api/v1/contact"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hotlineE164").value("0393284994"))
                .andExpect(jsonPath("$.email").value("thanhan.bg@vatlieuxd.com"));
    }

    @Test
    @Order(3)
    void quoteValidationAndCreate() throws Exception {
        mockMvc.perform(post("/api/v1/quote-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"A","phone":"123","message":"hi"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/quote-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "203.0.113.10")
                        .content("""
                                {
                                  "fullName":"Nguyen Van A",
                                  "phone":"0393284994",
                                  "email":"a@example.com",
                                  "productInterest":"Thép Hòa Phát",
                                  "message":"Xin báo giá thép D16",
                                  "sourcePage":"/#quote",
                                  "website":""
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("NEW"));
    }

    @Test
    @Order(4)
    void openApiDocsAvailable() throws Exception {
        MvcResult result = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode docs = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(docs.path("info").path("title").asText()).contains("Thanh An");
        assertThat(docs.path("paths").has("/api/v1/site")).isTrue();
        assertThat(docs.path("paths").has("/api/v1/quote-requests")).isTrue();
    }

    @Test
    @Order(5)
    void productNotFoundUsesErrorEnvelope() throws Exception {
        mockMvc.perform(get("/api/v1/products/00000000-0000-0000-0000-000000000099"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.path").value("/api/v1/products/00000000-0000-0000-0000-000000000099"));
    }

    @Test
    @Order(6)
    void malformedJsonAndInvalidParamsReturn400() throws Exception {
        mockMvc.perform(post("/api/v1/quote-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
                .andExpect(jsonPath("$.message").value("Malformed request body"))
                .andExpect(jsonPath("$.status").value(400));

        mockMvc.perform(get("/api/v1/products/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.details[0].field").value("id"));

        mockMvc.perform(get("/api/v1/products").param("page", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.details[0].field").value("page"));
    }

    @Test
    @Order(7)
    void spoofedXForwardedForDoesNotBypassRateLimit() throws Exception {
        String body = """
                {
                  "fullName":"Rate Limit Tester",
                  "phone":"0393284994",
                  "email":"rate@example.com",
                  "productInterest":"Thép Hòa Phát",
                  "message":"Rate limit probe message long enough",
                  "sourcePage":"/#quote",
                  "website":""
                }
                """;

        // Trusted proxies empty in test profile → X-Forwarded-For must be ignored.
        // Drain the shared peer-address bucket (may already have rows from earlier tests), then
        // confirm a fresh spoofed XFF still receives 429 instead of opening a new bucket.
        boolean hitLimit = false;
        for (int i = 0; i < 10; i++) {
            int status = mockMvc.perform(post("/api/v1/quote-requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Forwarded-For", "198.51.100." + (10 + i))
                            .content(body))
                    .andReturn()
                    .getResponse()
                    .getStatus();
            if (status == 429) {
                hitLimit = true;
                break;
            }
            assertThat(status).isEqualTo(201);
        }
        assertThat(hitLimit).as("expected rate limit after exhausting peer bucket").isTrue();

        mockMvc.perform(post("/api/v1/quote-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "203.0.113.200")
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.status").value(429));
    }
}

