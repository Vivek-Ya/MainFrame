package com.lifedata.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.lifedata.dashboard.dto.ProfileResponse;
import com.lifedata.dashboard.dto.UpdateProfileRequest;
import com.lifedata.dashboard.service.ProfileService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ProfileResponse> me() {
        return ResponseEntity.ok(profileService.me());
    }

    @PatchMapping
    public ResponseEntity<ProfileResponse> update(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(profileService.update(request));
    }

    @PostMapping(path = "/avatar")
    public ResponseEntity<ProfileResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(profileService.uploadAvatar(file));
    }

    @DeleteMapping(path = "/avatar")
    public ResponseEntity<ProfileResponse> deleteAvatar() {
        return ResponseEntity.ok(profileService.deleteAvatar());
    }
}
