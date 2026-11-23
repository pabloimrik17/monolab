## MODIFIED Requirements

### Requirement: nx-set-shas SHALL run on Node 24 runtime

El step `Set Nx SHA` en `.github/workflows/ci.yml` SHALL usar `nrwl/nx-set-shas` pineado a un commit SHA de 40 caracteres con comentario `# vX.Y.Z`, ejecutándose sobre el runner ya configurado con la versión de Node definida en `.nvmrc` (26.13.1 al momento de escribir), que `actions/setup-node` lee mediante `node-version-file`.

#### Scenario: CI step runs successfully on v5

- **WHEN** se ejecuta el job `main` en el workflow CI
- **THEN** el step `Set Nx SHA` completa sin error y exporta `NX_BASE` y `NX_HEAD` para los steps posteriores de `nx affected`
