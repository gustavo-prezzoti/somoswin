package com.backend.winai.security;

import com.backend.winai.entity.User;
import com.backend.winai.service.CompanyAppAccessService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Após JWT: nega acesso a APIs do app cliente quando o usuário não tem grant ao módulo.
 */
@Component
@RequiredArgsConstructor
public class CompanyAppModuleAuthorizationFilter extends OncePerRequestFilter {

    private final CompanyAppModuleRouteRegistry routeRegistry;
    private final CompanyAppAccessService companyAppAccessService;

    private static final List<String> SKIP_PREFIXES = List.of(
            "/api/v1/auth/",
            "/api/v1/public/",
            "/api/v1/user/",
            "/api/v1/company/",
            "/api/v1/notifications",
            "/api/v1/terms",
            "/api/v1/upload",
            "/api/v1/admin/",
            "/api/v1/asaas/",
            "/api/v1/drive/",
            "/api/v1/webhook",
            "/api/v1/webhooks/",
            "/api/internal/",
            "/ws",
            "/actuator/",
            "/error",
            "/v3/api-docs",
            "/swagger-ui",
            "/swagger-resources",
            "/webjars/");

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (shouldSkip(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        CompanyAppModule module = routeRegistry.resolveModule(uri);
        if (module == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        Object principal = auth.getPrincipal();
        if (!(principal instanceof User user)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!companyAppAccessService.mayAccessModule(user, module)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Sem permissão para este módulo do aplicativo.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldSkip(String uri) {
        for (String p : SKIP_PREFIXES) {
            if (uri.startsWith(p)) {
                return true;
            }
        }
        return false;
    }
}
