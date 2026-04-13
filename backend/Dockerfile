# Stage 1: Build
FROM gradle:8.12-jdk21 AS build

WORKDIR /app

COPY build.gradle settings.gradle ./
COPY gradle/ gradle/
COPY src/ src/

RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/build/libs/*.jar app.jar

RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-Xmx512m", "-jar", "app.jar"]
