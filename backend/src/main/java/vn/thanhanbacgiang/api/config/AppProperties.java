package vn.thanhanbacgiang.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Cors cors = new Cors();
    private final Quote quote = new Quote();
    private final Http http = new Http();

    public Cors getCors() {
        return cors;
    }

    public Quote getQuote() {
        return quote;
    }

    public Http getHttp() {
        return http;
    }

    public static class Http {
        /**
         * Peer addresses (exact IP or CIDR) allowed to supply {@code X-Forwarded-For}.
         * Empty = never trust forwarded headers (use {@code remoteAddr} only).
         */
        private List<String> trustedProxies = new ArrayList<>();

        public List<String> getTrustedProxies() {
            return trustedProxies;
        }

        public void setTrustedProxies(List<String> trustedProxies) {
            this.trustedProxies = trustedProxies != null ? trustedProxies : new ArrayList<>();
        }
    }

    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Quote {
        private final RateLimit rateLimit = new RateLimit();

        public RateLimit getRateLimit() {
            return rateLimit;
        }

        public static class RateLimit {
            private int maxRequests = 5;
            private int windowSeconds = 300;

            public int getMaxRequests() {
                return maxRequests;
            }

            public void setMaxRequests(int maxRequests) {
                this.maxRequests = maxRequests;
            }

            public int getWindowSeconds() {
                return windowSeconds;
            }

            public void setWindowSeconds(int windowSeconds) {
                this.windowSeconds = windowSeconds;
            }
        }
    }
}
