package com.example.shop.config;

import java.io.IOException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * 401/403 responses produced by the security filter chain (before MVC runs) with the same
 * ProblemDetail JSON body as every other error. The standard bearer-token handlers still set the
 * status and WWW-Authenticate header; these add the body.
 */
final class ProblemDetailSecurityHandlers {

    private ProblemDetailSecurityHandlers() {
    }

    static AuthenticationEntryPoint authenticationEntryPoint() {
        BearerTokenAuthenticationEntryPoint delegate = new BearerTokenAuthenticationEntryPoint();
        return (request, response, ex) -> {
            delegate.commence(request, response, ex);
            write(response, 401, "Unauthorized", detailFor(ex), request);
        };
    }

    static AccessDeniedHandler accessDeniedHandler() {
        BearerTokenAccessDeniedHandler delegate = new BearerTokenAccessDeniedHandler();
        return (request, response, ex) -> {
            delegate.handle(request, response, ex);
            write(response, 403, "Forbidden", "You do not have permission to do this", request);
        };
    }

    private static String detailFor(AuthenticationException ex) {
        return ex.getClass().getSimpleName().contains("InvalidBearerToken")
                ? "Your session is invalid or has expired. Please log in again."
                : "Please log in to continue.";
    }

    /** Only fixed strings and the request path go into the body; the path is JSON-escaped. */
    private static void write(HttpServletResponse response, int status, String title, String detail,
            HttpServletRequest request) throws IOException {
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("""
                {"type":"about:blank","title":"%s","status":%d,"detail":"%s","instance":"%s"}"""
                .formatted(title, status, detail, escape(request.getRequestURI())));
    }

    private static String escape(String value) {
        StringBuilder out = new StringBuilder();
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }
}
