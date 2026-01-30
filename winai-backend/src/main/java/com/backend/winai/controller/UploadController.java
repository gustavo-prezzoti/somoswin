package com.backend.winai.controller;

import com.backend.winai.service.SupabaseStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;
import java.util.Arrays;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
public class UploadController {

    private final SupabaseStorageService supabaseService;

    public UploadController(SupabaseStorageService supabaseService) {
        this.supabaseService = supabaseService;
    }

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "pdf", "txt");

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Please select a file to upload");
            }

            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String fileExtension = getFileExtension(originalFilename).toLowerCase();

            if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
                return ResponseEntity.badRequest().body("Unsupported file type. Allowed: " + ALLOWED_EXTENSIONS);
            }

            // Generate unique filename for Supabase
            String filename = UUID.randomUUID().toString() + "." + fileExtension;

            // Upload to Supabase bucket "social-media-uploads"
            String publicUrl = supabaseService.uploadFile("social-media-uploads", filename, file);

            Map<String, String> response = new HashMap<>();
            response.put("url", publicUrl);
            response.put("filename", originalFilename);
            response.put("type", fileExtension);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Could not upload file: " + e.getMessage());
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null)
            return "";
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex == -1) ? "" : filename.substring(dotIndex + 1);
    }
}
