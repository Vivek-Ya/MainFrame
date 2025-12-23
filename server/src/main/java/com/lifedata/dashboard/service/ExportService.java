package com.lifedata.dashboard.service;

import org.springframework.stereotype.Service;

import com.lifedata.dashboard.dto.ExportResponse;
import com.lifedata.dashboard.model.UserAccount;

@Service
public class ExportService {

    public ExportResponse exportCsv(UserAccount user) {
        // Placeholder: in production, stream CSV to object storage and return signed URL.
        String link = "https://example.com/downloads/activities.csv";
        return new ExportResponse("Export started", link);
    }

    public ExportResponse sendEmailDigest(UserAccount user) {
        // Placeholder: enqueue email digest job.
        return new ExportResponse("Email digest scheduled", null);
    }
}
