# add-scan-version-clamps

Make scan-npm-updates emit policy-coherent targets: uniform release-age gate (fixes #247) and @types/node engine-major clamp (fixes #251), plus an advisory version-family skew warning. Partition-breaking-changes drops its hardcoded family list — peerDependencies + override registry + agent reasoning, no family file.
