package vn.thanhanbacgiang.api;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.RefreshMode.BEFORE_CLASS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * When the peer is a trusted proxy, rate limiting keys on the rightmost non-trusted XFF hop
 * (the address the proxy appended). Spoofed leftmost hops must not open a new bucket.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.http.trusted-proxies=127.0.0.1",
        "app.quote.rate-limit.max-requests=2",
        "app.quote.rate-limit.window-seconds=300"
})
@AutoConfigureEmbeddedDatabase(type = AutoConfigureEmbeddedDatabase.DatabaseType.POSTGRES, provider = ZONKY, refresh = BEFORE_CLASS)
class TrustedProxyRateLimitTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void spoofedLeftmostXffDoesNotBypassLimitWhenPeerTrusted() throws Exception {
        String body = """
                {
                  "fullName":"Trusted Proxy Tester",
                  "phone":"0393284994",
                  "email":"xff@example.com",
                  "productInterest":"Thép Hòa Phát",
                  "message":"Trusted proxy XFF chain probe message",
                  "sourcePage":"/#quote",
                  "website":""
                }
                """;

        // nginx-style chain: client-spoofed, real-client (rightmost). Peer is 127.0.0.1 (trusted).
        String chain = "203.0.113.1, 198.51.100.50";
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/quote-requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Forwarded-For", chain)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        // Same real client, different spoofed leftmost — still rate limited.
        mockMvc.perform(post("/api/v1/quote-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "8.8.8.8, 198.51.100.50")
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        // Different rightmost hop is a different client → allowed.
        int other = mockMvc.perform(post("/api/v1/quote-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "1.1.1.1, 198.51.100.99")
                        .content(body))
                .andReturn()
                .getResponse()
                .getStatus();
        assertThat(other).isEqualTo(201);
    }
}
