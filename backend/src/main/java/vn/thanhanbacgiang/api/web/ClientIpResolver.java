package vn.thanhanbacgiang.api.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import vn.thanhanbacgiang.api.config.AppProperties;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

/**
 * Resolves the client IP for rate limiting.
 * <p>
 * {@code X-Forwarded-For} is honored only when the immediate peer ({@code remoteAddr})
 * is listed in {@code app.http.trusted-proxies}. When trusted, the client address is taken
 * from the <strong>rightmost</strong> hop that is not itself a trusted proxy — matching
 * reverse proxies that append {@code $remote_addr} (e.g. nginx {@code proxy_add_x_forwarded_for}).
 * Leftmost hops are client-controllable and must not become the rate-limit key.
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
        if (!isTrustedProxy(remote)) {
            return remote;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        String fromChain = clientFromForwardedChain(forwarded);
        return fromChain != null ? fromChain : remote;
    }

    /**
     * Walk XFF right → left; return the first hop that is not a configured trusted proxy.
     */
    String clientFromForwardedChain(String forwarded) {
        if (forwarded == null || forwarded.isBlank()) {
            return null;
        }
        List<String> hops = new ArrayList<>();
        for (String part : forwarded.split(",")) {
            String hop = normalize(part);
            if (hop != null && !hop.isBlank()) {
                hops.add(hop);
            }
        }
        if (hops.isEmpty()) {
            return null;
        }
        for (int i = hops.size() - 1; i >= 0; i--) {
            String hop = hops.get(i);
            if (!isTrustedProxy(hop)) {
                return hop;
            }
        }
        // Entire chain is trusted infrastructure — use the leftmost (original) hop.
        return hops.get(0);
    }

    boolean isTrustedProxy(String remoteAddr) {
        List<String> trusted = appProperties.getHttp().getTrustedProxies();
        if (trusted == null || trusted.isEmpty()) {
            return false;
        }
        String normalized = normalize(remoteAddr);
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        for (String entry : trusted) {
            if (entry == null || entry.isBlank()) {
                continue;
            }
            String rule = entry.trim();
            if (rule.contains("/")) {
                if (matchesCidr(normalized, rule)) {
                    return true;
                }
            } else if (normalized.equalsIgnoreCase(normalize(rule))) {
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
        String trimmed = addr.trim();
        if ("0:0:0:0:0:0:0:1".equals(trimmed) || "::1".equals(trimmed)) {
            return "127.0.0.1";
        }
        return trimmed;
    }
}
