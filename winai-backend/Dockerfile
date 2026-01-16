# syntax=docker/dockerfile:1.4
# =====================================
# Win AI Backend - Dockerfile
# Multi-stage build for Spring Boot
# With Maven cache optimization
# =====================================

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Copy pom.xml first for better caching
COPY pom.xml .

# Download dependencies with cache mount (persists between builds)
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build with cache mount
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn clean package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
RUN apk add --no-cache curl

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the built JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 8080

# Health check - increased start period to 120s for cold starts
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD curl -f http://127.0.0.1:8080/actuator/health || exit 1

# JVM optimizations for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.net.preferIPv4Stack=true"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
