package com.lifedata.dashboard.service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.lifedata.dashboard.dto.AuthRequest;
import com.lifedata.dashboard.dto.AuthResponse;
import com.lifedata.dashboard.dto.PasswordChangeRequest;
import com.lifedata.dashboard.dto.PasswordResetConfirmRequest;
import com.lifedata.dashboard.dto.PasswordResetRequest;
import com.lifedata.dashboard.dto.SignupRequest;
import com.lifedata.dashboard.model.Role;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.UserAccountRepository;
import com.lifedata.dashboard.security.JwtService;

@Service
public class AuthService {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserAccountRepository userRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse signup(SignupRequest request) {
        String normalizedEmail = request.email().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        UserAccount user = UserAccount.builder()
                .name(request.name())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .roles(Set.of(Role.USER))
                .build();
        userRepository.save(user);
        String token = jwtService.generateToken(user.getEmail(), Map.of("roles", user.getRoles()));
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet()));
    }

    public AuthResponse login(AuthRequest request) {
        String normalizedEmail = request.email().toLowerCase();
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(normalizedEmail, request.password()));
        UserAccount user = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        String token = jwtService.generateToken(authentication.getName(), Map.of("roles", user.getRoles()));
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet()));
    }

    @Transactional
    public void changePassword(UserAccount user, PasswordChangeRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public String requestPasswordReset(PasswordResetRequest request) {
        UserAccount user = userRepository.findByEmail(request.email()).orElseThrow(() -> new IllegalArgumentException("User not found"));
        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetExpiry(OffsetDateTime.now().plus(15, ChronoUnit.MINUTES));
        userRepository.save(user);
        return token;
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        UserAccount user = userRepository.findByPasswordResetToken(request.token())
                .orElseThrow(() -> new IllegalArgumentException("Invalid token"));
        if (user.getPasswordResetExpiry() == null || user.getPasswordResetExpiry().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Token expired");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiry(null);
        userRepository.save(user);
    }
}
