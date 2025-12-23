package com.lifedata.dashboard.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.lifedata.dashboard.dto.ProfileResponse;
import com.lifedata.dashboard.dto.UpdateProfileRequest;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.UserAccountRepository;

@Service
public class ProfileService {

    private final CurrentUserService currentUserService;
    private final UserAccountRepository userRepository;
    private final Path uploadRoot;
    private final String publicBase;

    public ProfileService(CurrentUserService currentUserService, UserAccountRepository userRepository,
                          @Value("${app.upload.dir:uploads}") String uploadDir,
                          @Value("${app.upload.public-base:/uploads}") String publicBase) {
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
        this.uploadRoot = Paths.get(uploadDir);
        this.publicBase = publicBase.endsWith("/") ? publicBase : publicBase + "/";
    }

    @Transactional(readOnly = true)
    public ProfileResponse me() {
        UserAccount user = currentUserService.currentUser();
        return toResponse(user);
    }

    @Transactional
    public ProfileResponse update(UpdateProfileRequest request) {
        UserAccount user = currentUserService.currentUser();
        if (request.name() != null) user.setName(request.name());
        if (request.themePreference() != null) user.setThemePreference(request.themePreference());
        if (request.notificationsEnabled() != null) user.setNotificationsEnabled(request.notificationsEnabled());
        if (request.weeklyEmailEnabled() != null) user.setWeeklyEmailEnabled(request.weeklyEmailEnabled());
        if (request.timezone() != null) user.setTimezone(request.timezone());
        if (request.trackedActivities() != null) {
            user.getTrackedActivities().clear();
            user.getTrackedActivities().addAll(request.trackedActivities());
        }
        if (request.avatarUrl() != null) user.setAvatarUrl(request.avatarUrl());
        if (request.gender() != null) user.setGender(request.gender());
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public ProfileResponse uploadAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar file is required");
        }
        String contentType = Optional.ofNullable(file.getContentType()).orElse("");
        if (!contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image uploads are allowed");
        }
        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("");
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : "";
        String filename = "user-" + currentUserService.currentUser().getId() + "-" + UUID.randomUUID() + ext;
        Path avatarDir = uploadRoot.resolve("avatars");
        try {
            Files.createDirectories(avatarDir);
            Path target = avatarDir.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store avatar");
        }
        UserAccount user = currentUserService.currentUser();
        deleteAvatarFileIfPresent(user.getAvatarUrl());
        String publicUrl = publicBase + "avatars/" + filename;
        user.setAvatarUrl(publicUrl);
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public ProfileResponse deleteAvatar() {
        UserAccount user = currentUserService.currentUser();
        deleteAvatarFileIfPresent(user.getAvatarUrl());
        user.setAvatarUrl(null);
        userRepository.save(user);
        return toResponse(user);
    }

    private void deleteAvatarFileIfPresent(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) return;
        String sanitized = avatarUrl.startsWith("/") ? avatarUrl.substring(1) : avatarUrl;
        if (sanitized.startsWith("uploads/")) {
            sanitized = sanitized.substring("uploads/".length());
        }
        Path candidate = uploadRoot.resolve(sanitized);
        try {
            Files.deleteIfExists(candidate);
        } catch (IOException ignored) {
            // Best effort cleanup
        }
    }

    private ProfileResponse toResponse(UserAccount user) {
        return new ProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getThemePreference(),
            user.getNotificationsEnabled(), user.getWeeklyEmailEnabled(), user.getTimezone(), user.getTrackedActivities(),
            user.getPasswordResetExpiry(), user.getAvatarUrl(), user.getGender());
    }
}
