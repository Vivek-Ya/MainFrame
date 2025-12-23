package com.lifedata.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import com.lifedata.dashboard.dto.AuthRequest;
import com.lifedata.dashboard.dto.AuthResponse;
import com.lifedata.dashboard.dto.PasswordChangeRequest;
import com.lifedata.dashboard.dto.PasswordResetConfirmRequest;
import com.lifedata.dashboard.dto.PasswordResetRequest;
import com.lifedata.dashboard.dto.SignupRequest;
import com.lifedata.dashboard.service.AuthService;
import com.lifedata.dashboard.service.CurrentUserService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserService currentUserService;

    public AuthController(AuthService authService, CurrentUserService currentUserService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(currentUserService.currentUser(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/reset/request")
    public ResponseEntity<String> requestReset(@Valid @RequestBody PasswordResetRequest request) {
        String token = authService.requestPasswordReset(request);
        return ResponseEntity.ok(token);
    }

    @PostMapping("/password/reset/confirm")
    public ResponseEntity<Void> confirmReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.confirmPasswordReset(request);
        return ResponseEntity.noContent().build();
    }
}
