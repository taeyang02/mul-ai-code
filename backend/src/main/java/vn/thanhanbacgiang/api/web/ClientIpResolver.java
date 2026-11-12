package vn.thanhanbacgiang.api.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import vn.thanhanbacgiang.api.config.AppProperties;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/**
 * Resolves the client IP for rate limiting.
 * {@code X-Forwarded-For} is honored only when the immediate peer ({@code remoteAddr})
 * is listed in {@code app.http.trusted-proxies}; otherwise the peer address is used.
 */
@Component
public class ClientIpResolver {

    private final AppProperties appProperties;

    public ClientIpResolver(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public String resolve(HttpServletRequest request) {
        String remote = normalize(request.getRemoteAddr());
        if (remote == null || remote.isBlank()) {
            return "unknown";
        }
        if (isTrustedProxy(remote)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                String first = forwarded.split(",")[0].trim();
                if (!first.isBlank()) {
                    return first;
                }
            }
        }
        return remote;
    }

    private boolean isTrustedProxy(String remoteAddr) {
        List<String> trusted = appProperties.getHttp().getTrustedProxies();
        if (trusted == null || trusted.isEmpty()) {
            return false;
        }
        for (String entry : trusted) {
            if (entry == null || entry.isBlank()) {
                continue;
            }
            String rule = entry.trim();
            if (rule.contains("/")) {
                if (matchesCidr(remoteAddr, rule)) {
                    return true;
                }
            } else if (remoteAddr.equalsIgnoreCase(normalize(rule))) {
                return true;
            }
        }
        return false;
    }

    static boolean matchesCidr(String ip, String cidr) {
        try {
            String[] parts = cidr.split("/");
            if (parts.length != 2) {
                return false;
            }
            InetAddress target = InetAddress.getByName(ip);
            InetAddress network = InetAddress.getByName(parts[0].trim());
            int prefix = Integer.parseInt(parts[1].trim());
            byte[] targetBytes = target.getAddress();
            byte[] networkBytes = network.getAddress();
            if (targetBytes.length != networkBytes.length) {
                return false;
            }
            int fullBytes = prefix / 8;
            int remBits = prefix % 8;
            for (int i = 0; i < fullBytes; i++) {
                if (targetBytes[i] != networkBytes[i]) {
                    return false;
                }
            }
            if (remBits == 0) {
                return true;
            }
            int mask = (~0) << (8 - remBits);
            return (targetBytes[fullBytes] & mask) == (networkBytes[fullBytes] & mask);
        } catch (UnknownHostException | NumberFormatException | ArrayIndexOutOfBoundsException ex) {
            return false;
        }
    }

    private static String normalize(String addr) {
        if (addr == null) {
            return null;
        }
        // MockMvc / loopback IPv6 forms
        if ("0:0:0:0:0:0:0:1".equals(addr) || "::1".equals(addr)) {
            return "127.0.0.1";
        }
        return addr.trim();
    }
}
