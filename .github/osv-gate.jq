def blocks($advisories):
  (.max_severity // "") as $score
  | if $score == "" then
      ((.ids | length) > 0
        and all(.ids[]; $advisories[.].database_specific.severity | IN("LOW", "MODERATE")))
      | not
    else
      ($score | tonumber) >= 7
    end;

def findings:
  .results[].packages[]
  | .package as $package
  | INDEX(.vulnerabilities[]?; .id) as $advisories
  | .groups[]
  | {package: $package, ids, max_severity, blocks: blocks($advisories)};

if $ARGS.named.output == "annotations" then
  findings
  | (if .blocks then "error" else "warning" end) as $level
  | "\(.ids | join(", ")) \(.package.name)@\(.package.version) max_severity=\(.max_severity // "")"
  | gsub("%"; "%25") | gsub("\r"; "%0D") | gsub("\n"; "%0A")
  | "::\($level)::\(.)"
elif $ARGS.named.output == "summary" then
  [findings]
  | sort_by((if .blocks then 0 else 1 end), -((.max_severity // "") | tonumber? // 0))
  | "## CVE gate",
    "",
    "\(length) findings, \(map(select(.blocks)) | length) blocking (CVSS >= 7.0, or unscored and not LOW/MODERATE).",
    if length > 0 then
      "",
      "| Advisory | Package | Severity | Blocks |",
      "| --- | --- | --- | --- |",
      (.[] | "| \(.ids | join(", ")) | `\(.package.name)@\(.package.version)` | \(.max_severity // "" | if . == "" then "unscored" else . end) | \(if .blocks then "yes" else "no" end) |")
    else empty end
else
  any(findings; .blocks) | not
end
