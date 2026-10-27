## ADDED Requirements

### Requirement: PhotoStoragePort

The system SHALL define a `PhotoStoragePort` technical port in `application/server/port/photo-storage.port.ts` with `upload(key, data, contentType)` returning the public URL, `delete(key)` and `deleteMany(keys)`, all `ResultAsync<_, StorageError>`. `StorageError` SHALL extend the kernel DomainError and live in `domain/error/planta-venta.error.ts`.

#### Scenario: Upload returns public URL
- **WHEN** `upload("plantas-venta/abc/img.jpg", buffer, "image/jpeg")` is called
- **THEN** it returns `Ok<"https://pub-xxx.r2.dev/plantas-venta/abc/img.jpg">`

#### Scenario: Delete non-existent key
- **WHEN** `delete("nonexistent.jpg")` is called
- **THEN** it returns `Ok<void>` (S3 DeleteObject is idempotent)

### Requirement: R2 photo storage implementation

The system SHALL implement `PhotoStoragePort` in `data/server/infra/storage/` of `@m0n0lab/green-beard-nursery`, on top of a generic S3-compatible client in `@m0n0lab/green-beard-platform` (`server/storage/s3.client.ts`). The platform's server Config SHALL read `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` and `R2_PUBLIC_URL`; `@aws-sdk/client-s3` SHALL be a platform dependency only. The implementation is bound in the module's `di/server.module.ts`.

#### Scenario: S3 client configured for R2
- **WHEN** the platform S3 client is created from the server Config
- **THEN** it uses the R2 endpoint and credentials

#### Scenario: Upload stores object in bucket
- **WHEN** `upload()` is called
- **THEN** a PutObject command is sent to R2 with the correct key, body, and content type

### Requirement: PlantaVentaFotoUploadUseCase

The system SHALL provide an injectable use case (`planta-venta-foto-upload.use-case.ts`) that:
1. Validates the PlantaVenta exists
2. Generates a unique key: `plantas-venta/{plantaVentaId}/{uuid}.{ext}`
3. Uploads to R2 via the PhotoStoragePort
4. Adds foto entry to the model
5. Updates the model in the repository

#### Scenario: Upload photo to existing plant
- **WHEN** executed with a valid plantaVentaId and image data
- **THEN** photo is uploaded to R2, model updated with new foto, returns updated PlantaVenta

#### Scenario: Upload to non-existent plant
- **WHEN** executed with non-existent plantaVentaId
- **THEN** returns `Err<NotFoundError>`

### Requirement: PlantaVentaFotoDeleteUseCase

The system SHALL provide an injectable use case (`planta-venta-foto-delete.use-case.ts`) that:
1. Validates PlantaVenta exists
2. Removes foto from the model (by key)
3. Deletes from R2 (best-effort)
4. Updates the model in the repository

#### Scenario: Delete existing photo
- **WHEN** executed with valid plantaVentaId and existing foto key
- **THEN** foto removed from model, deleted from R2

#### Scenario: Delete non-existent photo key
- **WHEN** executed with a key not in the model's fotos
- **THEN** returns `Err<NotFoundError>` referencing "Foto"

### Requirement: Cleanup on PlantaVenta deletion

When `PlantaVentaDeleteUseCase` executes, it SHALL:
1. Get all foto keys from the model
2. Delete the row from DB
3. Call `PhotoStoragePort.deleteMany(keys)` best-effort (failure logged, not blocking)

#### Scenario: Delete plant with photos
- **WHEN** a PlantaVenta with 3 photos is deleted
- **THEN** the row is deleted from DB and deleteMany is called with 3 keys

#### Scenario: R2 cleanup fails
- **WHEN** deleteMany fails after the row is deleted
- **THEN** entity is still deleted, error is logged (not returned)

### Requirement: Multipart upload handling in API

The Hono route `POST /plantas-venta/:id/fotos` in `apps/green-beard-api/src/nursery/route/planta-venta.route.ts` SHALL:
1. Parse multipart form data
2. Validate file type (image/jpeg, image/png, image/webp)
3. Validate file size (max 10MB)
4. Call `PlantaVentaFotoUploadUseCase`

#### Scenario: Valid image upload
- **WHEN** a JPEG file under 10MB is uploaded
- **THEN** returns 200 with updated PlantaVentaDto

#### Scenario: Invalid file type
- **WHEN** a PDF file is uploaded
- **THEN** returns 422 with validation error

#### Scenario: File too large
- **WHEN** a 15MB file is uploaded
- **THEN** returns 422 with validation error
