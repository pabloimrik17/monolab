## ADDED Requirements

### Requirement: PhotoStorage port

The system SHALL define a `PhotoStorage` interface (port) in `green-beard-domain`:
- `upload(key: string, data: Buffer, contentType: string)`: ResultAsync<string, StorageError> — returns the public URL
- `delete(key: string)`: ResultAsync<void, StorageError> — deletes from storage
- `deleteMany(keys: string[])`: ResultAsync<void, StorageError> — bulk delete

`StorageError` SHALL extend DomainError.

#### Scenario: Upload returns public URL
- **WHEN** `upload("plantas-venta/abc/img.jpg", buffer, "image/jpeg")` is called
- **THEN** it returns `Ok<"https://pub-xxx.r2.dev/plantas-venta/abc/img.jpg">`

#### Scenario: Delete non-existent key
- **WHEN** `delete("nonexistent.jpg")` is called
- **THEN** it returns `Ok<void>` (S3 DeleteObject is idempotent)

### Requirement: R2PhotoStorage implementation

The system SHALL implement `PhotoStorage` using `@aws-sdk/client-s3` configured for Cloudflare R2. Configuration via environment variables: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

The implementation SHALL be in `green-beard-data` (infrastructure adapter) and registered via `dataModule`.

#### Scenario: S3 client configured for R2
- **WHEN** R2PhotoStorage is instantiated
- **THEN** it creates an S3Client with the R2 endpoint and credentials

#### Scenario: Upload stores object in bucket
- **WHEN** `upload()` is called
- **THEN** a PutObject command is sent to R2 with the correct key, body, and content type

### Requirement: UploadPlantaVentaFotoUseCase

The system SHALL provide an injectable use case that:
1. Validates the PlantaVenta exists
2. Generates a unique key: `plantas-venta/{plantaVentaId}/{uuid}.{ext}`
3. Uploads to R2 via PhotoStorage port
4. Adds foto entry to entity
5. Updates entity in repository

#### Scenario: Upload photo to existing plant
- **WHEN** executed with a valid plantaVentaId and image data
- **THEN** photo is uploaded to R2, entity updated with new foto, returns updated PlantaVenta

#### Scenario: Upload to non-existent plant
- **WHEN** executed with non-existent plantaVentaId
- **THEN** returns `Err<NotFoundError>`

### Requirement: DeletePlantaVentaFotoUseCase

The system SHALL provide an injectable use case that:
1. Validates PlantaVenta exists
2. Removes foto from entity (by key)
3. Deletes from R2 (best-effort)
4. Updates entity in repository

#### Scenario: Delete existing photo
- **WHEN** executed with valid plantaVentaId and existing foto key
- **THEN** foto removed from entity, deleted from R2

#### Scenario: Delete non-existent photo key
- **WHEN** executed with a key not in the entity's fotos
- **THEN** returns `Err<NotFoundError>` referencing "Foto"

### Requirement: Cleanup on PlantaVenta deletion

When `DeletePlantaVentaUseCase` executes, it SHALL:
1. Get all foto keys from the entity
2. Delete entity from DB
3. Call `PhotoStorage.deleteMany(keys)` best-effort (failure logged, not blocking)

#### Scenario: Delete plant with photos
- **WHEN** a PlantaVenta with 3 photos is deleted
- **THEN** entity is deleted from DB and deleteMany is called with 3 keys

#### Scenario: R2 cleanup fails
- **WHEN** deleteMany fails after entity deletion
- **THEN** entity is still deleted, error is logged (not returned)

### Requirement: Multipart upload handling in API

The Hono route `POST /plantas-venta/:id/fotos` SHALL:
1. Parse multipart form data
2. Validate file type (image/jpeg, image/png, image/webp)
3. Validate file size (max 10MB)
4. Call `UploadPlantaVentaFotoUseCase`

#### Scenario: Valid image upload
- **WHEN** a JPEG file under 10MB is uploaded
- **THEN** returns 200 with updated PlantaVentaDto

#### Scenario: Invalid file type
- **WHEN** a PDF file is uploaded
- **THEN** returns 422 with validation error

#### Scenario: File too large
- **WHEN** a 15MB file is uploaded
- **THEN** returns 422 with validation error
