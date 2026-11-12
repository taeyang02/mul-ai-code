package vn.thanhanbacgiang.api.web;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    @Test
    void cidrMatchIpv4() {
        assertThat(ClientIpResolver.matchesCidr("10.0.0.5", "10.0.0.0/8")).isTrue();
        assertThat(ClientIpResolver.matchesCidr("11.0.0.5", "10.0.0.0/8")).isFalse();
        assertThat(ClientIpResolver.matchesCidr("172.18.0.4", "172.16.0.0/12")).isTrue();
        assertThat(ClientIpResolver.matchesCidr("172.32.0.1", "172.16.0.0/12")).isFalse();
    }
}
