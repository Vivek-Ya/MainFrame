package com.lifedata.dashboard.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.lifedata.dashboard.model.Role;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.UserAccountRepository;

@Component
public class GoogleOAuthSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserAccountRepository userRepository;
    private final JwtService jwtService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public GoogleOAuthSuccessHandler(UserAccountRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = (String) oAuth2User.getAttributes().get("email");
        String name = (String) oAuth2User.getAttributes().getOrDefault("name", "User");
        if (email == null) {
            response.sendError(400, "Email not provided by Google");
            return;
        }
        UserAccount user = userRepository.findByEmail(email.toLowerCase()).orElseGet(() -> {
            UserAccount created = UserAccount.builder()
                    .email(email.toLowerCase())
                    .name(name)
                    .roles(Set.of(Role.USER))
                    .build();
            return userRepository.save(created);
        });
        String token = jwtService.generateToken(user.getEmail(), Map.of("roles", user.getRoles()));
        String target = frontendUrl + "/oauth2/success?token=" + token; // Simplified URL encoding
        getRedirectStrategy().sendRedirect(request, response, target);
    }
}
