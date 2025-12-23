package com.lifedata.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lifedata.dashboard.dto.ExportResponse;
import com.lifedata.dashboard.service.CurrentUserService;
import com.lifedata.dashboard.service.ExportService;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;
    private final CurrentUserService currentUserService;

    public ExportController(ExportService exportService, CurrentUserService currentUserService) {
        this.exportService = exportService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/csv")
    public ResponseEntity<ExportResponse> exportCsv() {
        return ResponseEntity.ok(exportService.exportCsv(currentUserService.currentUser()));
    }

    @PostMapping("/email")
    public ResponseEntity<ExportResponse> emailDigest() {
        return ResponseEntity.ok(exportService.sendEmailDigest(currentUserService.currentUser()));
    }
}
