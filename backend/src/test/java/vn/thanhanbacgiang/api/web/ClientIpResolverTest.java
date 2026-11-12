package vn.thanhanbacgiang.api.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.thanhanbacgiang.api.config.AppProperties;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    private AppProperties props;
    private ClientIpResolver resolver;

    @BeforeEach
    void setUp() {
        props = new AppProperties();
        resolver = new ClientIpResolver(props);
    }

    @Test
    void cidrMatchIpv4() {
        assertThat(ClientIpResolver.matchesCidr("10.0.0.5", "10.0.0.0/8")).isTrue();
        assertThat(ClientIpResolver.matchesCidr("11.0.0.5", "10.0.0.0/8")).isFalse();
        assertThat(ClientIpResolver.matchesCidr("172.18.0.4", "172.16.0.0/12")).isTrue();
        assertThat(ClientIpResolver.matchesCidr("172.32.0.1", "172.16.0.0/12")).isFalse();
    }

    @Test
    void trustedChainUsesRightmostNonTrustedHop() {
        props.getHttp().setTrustedProxies(List.of("10.0.0.1", "172.18.0.0/16"));
        // Client-spoofed leftmost + real client that nginx appended
        assertThat(resolver.clientFromForwardedChain("203.0.113.99, 198.51.100.10"))
                .isEqualTo("198.51.100.10");
        // Trailing trusted proxy hop is skipped
        assertThat(resolver.clientFromForwardedChain("198.51.100.10, 10.0.0.1"))
                .isEqualTo("198.51.100.10");
        assertThat(resolver.clientFromForwardedChain("198.51.100.10, 172.18.0.4"))
                .isEqualTo("198.51.100.10");
    }

    @Test
    void leftmostSpoofDoesNotWinOverAppendedClient() {
        props.getHttp().setTrustedProxies(List.of("127.0.0.1"));
        assertThat(resolver.clientFromForwardedChain("1.1.1.1, 9.9.9.9"))
                .isEqualTo("9.9.9.9");
    }
}
