package com.lifedata.dashboard.dto;

import java.util.Set;

public record AuthResponse(String token, Long userId, String name, String email, Set<String> roles) {}
