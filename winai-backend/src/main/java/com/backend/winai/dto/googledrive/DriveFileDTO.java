package com.backend.winai.dto.googledrive;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriveFileDTO {
    private String id;
    private String name;
    private String mimeType;
    private String iconLink;
    private String thumbnailLink;
    private String webViewLink;
    private Long size;
    private boolean isFolder;
}
