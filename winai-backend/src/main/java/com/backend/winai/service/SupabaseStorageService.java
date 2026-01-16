package com.backend.winai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class SupabaseStorageService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String supabaseServiceRoleKey;

    private static final String BUCKET_NAME = "avatars";
    private final java.util.Set<String> checkedBuckets = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public SupabaseStorageService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Garante que o bucket padrão existe
     */
    private void ensureBucketExists() {
        ensureBucketExists(BUCKET_NAME);
    }

    /**
     * Cria o bucket se ele não existir
     */
    public void ensureBucketExists(String bucketName) {
        if (checkedBuckets.contains(bucketName)) {
            return;
        }

        synchronized (this) {
            if (checkedBuckets.contains(bucketName)) {
                return;
            }

            try {
                // Verificar se o bucket existe
                HttpHeaders headers = new HttpHeaders();
                headers.setBearerAuth(supabaseServiceRoleKey);
                headers.set("apikey", supabaseServiceRoleKey);
                headers.set("Authorization", "Bearer " + supabaseServiceRoleKey);
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<Void> checkEntity = new HttpEntity<>(headers);
                String checkUrl = supabaseUrl + "/storage/v1/bucket/" + bucketName;

                try {
                    ResponseEntity<String> checkResponse = restTemplate.exchange(
                            checkUrl,
                            HttpMethod.GET,
                            checkEntity,
                            String.class);
                    // Bucket existe
                    if (checkResponse.getStatusCode().is2xxSuccessful()) {
                        checkedBuckets.add(bucketName);
                        log.info("Bucket '{}' already exists", bucketName);
                        return;
                    }
                } catch (Exception e) {
                    // Bucket não existe, vamos criar
                    log.info("Bucket '{}' not found, creating...", bucketName);
                }

                // Criar o bucket
                Map<String, Object> bucketConfig = new HashMap<>();
                bucketConfig.put("name", bucketName);
                bucketConfig.put("public", true); // Bucket público para acesso às imagens
                bucketConfig.put("file_size_limit", null); // Sem limite de tamanho
                bucketConfig.put("allowed_mime_types", null); // Aceita todos os tipos

                HttpEntity<String> createEntity = new HttpEntity<>(
                        objectMapper.writeValueAsString(bucketConfig),
                        headers);

                String createUrl = supabaseUrl + "/storage/v1/bucket";
                ResponseEntity<String> response = restTemplate.exchange(
                        createUrl,
                        HttpMethod.POST,
                        createEntity,
                        String.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    checkedBuckets.add(bucketName);
                    log.info("Bucket '{}' created successfully", bucketName);
                } else {
                    log.warn("Failed to create bucket. Status: {}, Body: {}", response.getStatusCode(),
                            response.getBody());
                }
            } catch (Exception e) {
                log.error("Error ensuring bucket exists: " + bucketName, e);
                // Não lançar exceção, apenas logar - pode ser que o bucket já exista
            }
        }
    }

    /**
     * Faz upload de uma imagem para o bucket de avatares do Supabase
     * 
     * @param file   Arquivo de imagem
     * @param userId ID do usuário
     * @return URL pública da imagem
     */
    public String uploadAvatar(MultipartFile file, UUID userId) throws IOException {
        // Garantir que o bucket existe
        ensureBucketExists();

        // Validar tipo de arquivo
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Apenas arquivos de imagem são permitidos");
        }

        // Gerar nome único para o arquivo
        String fileExtension = getFileExtension(file.getOriginalFilename());
        String fileName = userId.toString() + "_" + UUID.randomUUID() + fileExtension;
        String filePath = fileName; // Path dentro do bucket

        try {
            // Preparar headers para upload
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(supabaseServiceRoleKey);
            headers.set("apikey", supabaseServiceRoleKey);
            headers.set("Authorization", "Bearer " + supabaseServiceRoleKey);
            // Não definir Content-Type manualmente - deixar o RestTemplate fazer isso
            // automaticamente

            // Criar HttpEntity com o conteúdo do arquivo
            // O RestTemplate vai definir o Content-Type automaticamente baseado no tipo do
            // arquivo
            HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);

            // Upload do arquivo usando a API do Supabase Storage
            // Formato: POST /storage/v1/object/{bucket}/{path}
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + filePath;

            ResponseEntity<String> response = restTemplate.exchange(
                    uploadUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Retornar URL pública
                String publicUrl = supabaseUrl + "/storage/v1/object/public/" + BUCKET_NAME + "/" + filePath;
                log.info("Avatar uploaded successfully: {}", publicUrl);
                return publicUrl;
            } else {
                log.error("Failed to upload avatar. Status: {}, Body: {}", response.getStatusCode(),
                        response.getBody());

                // Se o erro for que o bucket não existe, tentar criar novamente
                if (response.getBody() != null && response.getBody().contains("Bucket not found")) {
                    checkedBuckets.remove(BUCKET_NAME); // Reset para tentar criar novamente
                    ensureBucketExists();
                    // Tentar upload novamente
                    response = restTemplate.exchange(uploadUrl, HttpMethod.POST, requestEntity, String.class);
                    if (response.getStatusCode().is2xxSuccessful()) {
                        String publicUrl = supabaseUrl + "/storage/v1/object/public/" + BUCKET_NAME + "/" + filePath;
                        log.info("Avatar uploaded successfully after bucket creation: {}", publicUrl);
                        return publicUrl;
                    }
                }

                throw new RuntimeException("Erro ao fazer upload da imagem: " + response.getBody());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("HTTP error uploading avatar. Status: {}, Body: {}", e.getStatusCode(),
                    e.getResponseBodyAsString());

            // Se o erro for que o bucket não existe, tentar criar novamente
            if (e.getResponseBodyAsString() != null && e.getResponseBodyAsString().contains("Bucket not found")) {
                checkedBuckets.remove(BUCKET_NAME); // Reset para tentar criar novamente
                ensureBucketExists();
                // Tentar upload novamente
                try {
                    HttpHeaders headers = new HttpHeaders();
                    headers.setBearerAuth(supabaseServiceRoleKey);
                    headers.set("apikey", supabaseServiceRoleKey);
                    headers.set("Authorization", "Bearer " + supabaseServiceRoleKey);
                    HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);
                    String uploadUrl = supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + filePath;
                    ResponseEntity<String> retryResponse = restTemplate.exchange(
                            uploadUrl, HttpMethod.POST, requestEntity, String.class);
                    if (retryResponse.getStatusCode().is2xxSuccessful()) {
                        String publicUrl = supabaseUrl + "/storage/v1/object/public/" + BUCKET_NAME + "/" + filePath;
                        log.info("Avatar uploaded successfully after bucket creation: {}", publicUrl);
                        return publicUrl;
                    }
                } catch (Exception retryException) {
                    log.error("Failed to upload after bucket creation", retryException);
                }
            }

            throw new RuntimeException("Erro ao fazer upload da imagem: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Error uploading avatar", e);
            throw new RuntimeException("Erro ao fazer upload da imagem: " + e.getMessage(), e);
        }
    }

    /**
     * Deleta uma imagem do bucket
     */
    public void deleteAvatar(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isEmpty()) {
            return;
        }

        try {
            // Extrair o path do URL (formato: /storage/v1/object/public/bucket/path)
            String path = avatarUrl.replace(supabaseUrl + "/storage/v1/object/public/" + BUCKET_NAME + "/", "");

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(supabaseServiceRoleKey);
            headers.set("apikey", supabaseServiceRoleKey);
            headers.set("Authorization", "Bearer " + supabaseServiceRoleKey);

            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            // Formato: DELETE /storage/v1/object/{bucket}/{path}
            String deleteUrl = supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + path;
            restTemplate.exchange(deleteUrl, HttpMethod.DELETE, requestEntity, Void.class);

            log.info("Avatar deleted successfully: {}", path);
        } catch (Exception e) {
            log.error("Error deleting avatar", e);
            // Não lançar exceção, apenas logar o erro
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return ".jpg";
        }
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot) : ".jpg";
    }

    /**
     * Faz upload de um arquivo genérico para qualquer bucket do Supabase
     * 
     * @param bucketName Nome do bucket
     * @param filePath   Caminho completo do arquivo dentro do bucket (ex:
     *                   "company-id/folder/file.jpg")
     * @param file       Arquivo a ser enviado
     * @return URL pública do arquivo
     */
    public String uploadFileBytes(String bucketName, String filePath, byte[] content, String contentType) {
        // Garantir que o bucket existe
        ensureBucketExists(bucketName);

        try {
            // Preparar headers para upload
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(supabaseServiceRoleKey);
            headers.set("apikey", supabaseServiceRoleKey);
            headers.set("Authorization", "Bearer " + supabaseServiceRoleKey);
            headers.setContentType(MediaType.parseMediaType(contentType));

            // Criar HttpEntity com o conteúdo do arquivo
            HttpEntity<byte[]> requestEntity = new HttpEntity<>(content, headers);

            // Upload do arquivo usando a API do Supabase Storage
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + filePath;

            ResponseEntity<String> response = restTemplate.exchange(
                    uploadUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Retornar URL pública
                String publicUrl = supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + filePath;
                log.info("File uploaded successfully: {}", publicUrl);
                return publicUrl;
            } else {
                log.error("Failed to upload file. Status: {}, Body: {}", response.getStatusCode(), response.getBody());
                throw new RuntimeException("Erro ao fazer upload do arquivo: " + response.getBody());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("HTTP error uploading file. Status: {}, Body: {}", e.getStatusCode(),
                    e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao fazer upload do arquivo: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Error uploading file", e);
            throw new RuntimeException("Erro ao fazer upload do arquivo: " + e.getMessage(), e);
        }
    }

    /**
     * @param file Arquivo a ser enviado
     * @return URL pública do arquivo
     */
    public String uploadFile(String bucketName, String filePath, MultipartFile file) throws IOException {
        // Garantir que o bucket existe
        ensureBucketExists(bucketName);

        try {
            // Preparar headers para upload
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(supabaseServiceRoleKey);
            headers.set("apikey", supabaseServiceRoleKey);
            headers.set("Authorization", "Bearer " + supabaseServiceRoleKey);

            // Criar HttpEntity com o conteúdo do arquivo
            HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);

            // Upload do arquivo usando a API do Supabase Storage
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + filePath;

            ResponseEntity<String> response = restTemplate.exchange(
                    uploadUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Retornar URL pública
                String publicUrl = supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + filePath;
                log.info("File uploaded successfully: {}", publicUrl);
                return publicUrl;
            } else {
                log.error("Failed to upload file. Status: {}, Body: {}", response.getStatusCode(), response.getBody());
                throw new RuntimeException("Erro ao fazer upload do arquivo: " + response.getBody());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("HTTP error uploading file. Status: {}, Body: {}", e.getStatusCode(),
                    e.getResponseBodyAsString());
            throw new RuntimeException("Erro ao fazer upload do arquivo: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Error uploading file", e);
            throw new RuntimeException("Erro ao fazer upload do arquivo: " + e.getMessage(), e);
        }
    }
}
