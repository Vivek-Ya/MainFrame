package com.lifedata.dashboard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(@NotBlank @Size(max = 120) String name,
							@Email @NotBlank String email,
							@NotBlank @Size(min = 8, max = 100) String password) {}
